import { beforeEach, expect, it, vi } from "vitest";
import { getXRAGWorkerOptions } from "../packages/database/src/xrag/getXRAGWorkerOptions.ts";
const state = vi.hoisted(() => ({ claims: vi.fn(), client: vi.fn() }));
vi.mock("../packages/database/src/user/buildAccessToken.ts", () => ({
  buildAccessToken: state.claims,
}));
vi.mock("../packages/database/src/auth/createClientWithClaims.ts", () => ({
  createClientWithClaims: state.client,
}));
beforeEach(() => {
  vi.resetAllMocks();
  state.client.mockResolvedValue({ caller: true });
});
const role = (role: string, organization_id = "workspace") => ({
  role,
  organization_id,
});
const supabase = (user: any = { id: "user", app_metadata: {} }) =>
  ({
    auth: {
      admin: {
        getUserById: vi.fn(async () => ({ data: { user }, error: null })),
      },
    },
  }) as any;
it("intersects current permissions with the saved ceiling and refreshes worker tokens", async () => {
  state.claims.mockResolvedValue("admin");
  const result = await getXRAGWorkerOptions(
    "user",
    [role("workspace-admin")],
    supabase(),
  );
  expect(result.authenticated?.claims).toEqual([role("workspace-admin")]);
  expect(state.client).toHaveBeenCalledWith(
    "user",
    [role("workspace-admin")],
    undefined,
    true,
  );
});
it("uses current workspace roles when a global administrator was demoted", async () => {
  state.claims.mockResolvedValue([role("workspace-admin")]);
  expect(
    (await getXRAGWorkerOptions("user", "admin", supabase())).authenticated
      ?.claims,
  ).toEqual([role("workspace-admin")]);
});
it.each([null, { banned_until: "2099-01-01T00:00:00Z" }])(
  "rejects deleted or banned owners",
  async (user) => {
    await expect(
      getXRAGWorkerOptions("user", "admin", supabase(user)),
    ).rejects.toThrow("NOT_AUTHORIZED");
    expect(state.client).not.toHaveBeenCalled();
  },
);
it("rejects revoked admin membership and never widens the saved scope", async () => {
  state.claims.mockResolvedValue([
    role("user"),
    role("workspace-admin", "other"),
  ]);
  await expect(
    getXRAGWorkerOptions("user", [role("workspace-admin")], supabase()),
  ).rejects.toThrow("NOT_AUTHORIZED");
});

it("omits lost workspaces and keeps the lesser role in every remaining workspace", async () => {
  state.claims.mockResolvedValue([
    role("workspace-admin", "retained"),
    role("editor", "demoted"),
    role("workspace-admin", "promoted"),
    role("workspace-admin", "new"),
  ]);
  const { authenticated } = await getXRAGWorkerOptions(
    "user",
    [
      role("workspace-admin", "retained"),
      role("workspace-admin", "demoted"),
      role("user", "promoted"),
      role("workspace-admin", "removed"),
    ],
    supabase(),
  );
  expect(authenticated?.claims).toEqual([
    role("workspace-admin", "retained"),
    role("editor", "demoted"),
    role("user", "promoted"),
  ]);
});
