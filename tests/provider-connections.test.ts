import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: { id: "admin" } as object | null,
  claims: "admin" as unknown,
  list: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  service: vi.fn(),
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
  }),
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: mocks.service,
}));
vi.mock("@schornio/aibox-package-database/user/getCurrentUserClaims", () => ({
  getCurrentUserClaims: async () => mocks.claims,
}));
vi.mock("@schornio/aibox-package-database/connections/listConnections", () => ({
  listConnections: mocks.list,
}));
vi.mock(
  "@schornio/aibox-package-database/connections/getConnectionCredentials",
  () => ({ getConnectionCredentials: mocks.get }),
);
vi.mock("@schornio/aibox-package-database/connections/saveConnection", () => ({
  saveConnection: mocks.save,
}));
vi.mock(
  "@schornio/aibox-package-database/connections/deleteConnection",
  () => ({ deleteConnection: mocks.remove }),
);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { saveConnection } from "../apps/web/app/(settings)/settings/connections/_actions/saveConnection";
import { deleteConnection } from "../apps/web/app/(settings)/settings/connections/_actions/deleteConnection";
const id = "00000000-0000-4000-8000-000000000001";
const data = {
  name: "GitHub",
  kind: "oauth" as const,
  clientId: "client",
  secret: "new-secret",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "admin" };
  mocks.claims = "admin";
  mocks.get.mockResolvedValue({
    id,
    kind: "oauth",
    client_id: "client",
    secret: "old-secret",
  });
});
it.each([[], [{ role: "workspace-admin" }], [{ role: "user" }]])(
  "denies mutations without global administrator claims: %j",
  async (claims) => {
    mocks.claims = claims;
    expect((await saveConnection(data))?.serverError).toBeTruthy();
    expect((await deleteConnection({ id }))?.serverError).toBeTruthy();
    expect(mocks.service).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  },
);
it("saves secrets server-side and returns only the identifier", async () => {
  const result = await saveConnection(data);
  expect(result?.data).toEqual({ id: expect.any(String) });
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({ secret: "new-secret", client_id: "client" }),
    expect.anything(),
  );
  expect(JSON.stringify(result)).not.toContain("secret");
});
it("preserves the existing OAuth credentials when renaming", async () => {
  expect(
    (await saveConnection({ id, name: "Renamed", kind: "oauth" }))?.data,
  ).toEqual({ id });
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Renamed",
      secret: "old-secret",
      client_id: "client",
    }),
    expect.anything(),
  );
});
it.each([
  { clientId: "other", secret: "" },
  { clientId: "client", secret: "replacement" },
])("rejects OAuth credential edits: %j", async (changes) => {
  expect(
    (await saveConnection({ ...data, id, ...changes }))?.serverError,
  ).toBeTruthy();
  expect(mocks.save).not.toHaveBeenCalled();
});
it.each([undefined, "", "   "])(
  "requires a nonblank secret on creation: %j",
  async (secret) => {
    expect(
      (await saveConnection({ ...data, secret }))?.validationErrors,
    ).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
  },
);
it.each(["brave", "staan"] as const)(
  "preserves an unchanged search key: %s",
  async (kind) => {
    mocks.get.mockResolvedValue({
      id,
      kind,
      client_id: null,
      secret: "old-secret",
    });
    expect(
      (await saveConnection({ id, name: "Search", kind, secret: "" }))?.data,
    ).toEqual({ id });
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ secret: "old-secret", client_id: null }),
      expect.anything(),
    );
  },
);
it("prevents changing provider type and recreating deleted connections", async () => {
  expect(
    (await saveConnection({ ...data, id, kind: "brave" }))?.serverError,
  ).toBeTruthy();
  mocks.get.mockResolvedValue(null);
  expect((await saveConnection({ ...data, id }))?.serverError).toBeTruthy();
  expect(mocks.save).not.toHaveBeenCalled();
});
it.each([
  { id: "------------------------------------" },
  { name: " " },
  { market: "invalid" },
  { clientId: "" },
])("validates input before privileged access: %j", async (input) => {
  expect(
    (await saveConnection({ ...data, ...input }))?.validationErrors,
  ).toBeTruthy();
  expect(mocks.service).not.toHaveBeenCalled();
});
it("never forwards credential-bearing errors", async () => {
  mocks.save.mockRejectedValueOnce(new Error("secret-leak"));
  const response = await saveConnection(data);
  expect(response?.serverError).toBe("INTERNAL_SERVER_ERROR");
  expect(JSON.stringify(response)).not.toContain("secret-leak");
});
it("deletes as a global admin", async () => {
  expect((await deleteConnection({ id }))?.data).toEqual({ id });
  expect(mocks.remove).toHaveBeenCalledWith(id, expect.anything());
});
it.each([
  { user: null, claims: "admin", allowed: false },
  {
    user: { id: "viewer" },
    claims: [{ role: "workspace-member" }],
    allowed: false,
  },
  {
    user: { id: "editor" },
    claims: [{ role: "workspace-admin" }],
    allowed: true,
  },
  { user: { id: "admin" }, claims: "admin", allowed: true },
])(
  "authorizes server-rendered connection metadata: $allowed for $claims",
  async ({ user, claims, allowed }) => {
    mocks.user = user;
    mocks.claims = claims;
    mocks.list.mockResolvedValue([]);
    const { getAgentConnections } =
      await import("../apps/web/app/_models/getAgentConnections");
    expect(await getAgentConnections()).toEqual([]);
    expect(mocks.service).toHaveBeenCalledTimes(allowed ? 1 : 0);
    expect(mocks.list).toHaveBeenCalledTimes(allowed ? 1 : 0);
  },
);
