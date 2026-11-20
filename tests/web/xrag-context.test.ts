import { beforeEach, expect, it, vi } from "vitest";
import { query } from "../helpers/supabase.ts";
const state = vi.hoisted(() => ({
  supabase: undefined as any,
  service: { privileged: true },
  create: vi.fn(),
  global: vi.fn(),
  model: vi.fn(async () => ({ id: "model" })),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => state.supabase,
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: state.create,
}));
vi.mock("@/lib/supabase/saveCreateSupabaseServiceRoleClient", () => ({
  saveCreateSupabaseServiceRoleClient: state.global,
}));
vi.mock("@schornio/aibox-package-database/aiModel/getAIModelById", () => ({
  getAIModelById: state.model,
}));
import { getXRAGContext } from "../../apps/web/lib/xrag/getXRAGContext";
const userId = "11111111-1111-4111-8111-111111111111";
const source = {
  path: `${userId}/22222222-2222-4222-8222-222222222222/archive.tar`,
};
function claims(value: unknown) {
  state.supabase.auth.getClaims.mockResolvedValue({
    data: { claims: { organization_roles: value } },
    error: null,
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  state.create.mockReturnValue(state.service);
  state.global.mockResolvedValue(state.service);
  state.supabase = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: userId } },
        error: null,
      })),
      getClaims: vi.fn(),
    },
    from: vi.fn(() =>
      query({
        data: {
          id: "repo",
          name: "Files",
          description: "",
          organization_id: "workspace",
          config: { type: "database-v2", identifier: "repo" },
        },
        error: null,
      }),
    ),
  };
  claims([{ organization_id: "workspace", role: "workspace-admin" }]);
});
it("authenticates owned sources and the exact target before exposing a service client", async () => {
  const result = await getXRAGContext({
    source,
    target: { workspaceId: "workspace" },
  });
  expect(result.authenticated).toEqual({
    userId,
    claims: [{ organization_id: "workspace", role: "workspace-admin" }],
  });
  expect(result.supabaseServiceRole).toBe(state.service);
  expect(state.create).toHaveBeenCalledTimes(1);
  expect(state.global).not.toHaveBeenCalled();
});
it.each([
  {
    source: {
      path: source.path.replace(userId, "33333333-3333-4333-8333-333333333333"),
    },
  },
  { target: { workspaceId: "other" } },
  { target: { workspaceId: "workspace", newWorkspaceName: "New" } },
])(
  "rejects unauthorized sources and targets before service-client creation: %j",
  async (input) => {
    await expect(getXRAGContext(input)).rejects.toThrow("NOT_AUTHORIZED");
    expect(state.create).not.toHaveBeenCalled();
    expect(state.global).not.toHaveBeenCalled();
  },
);
it("checks the actual resource's workspace instead of trusting a supplied object ID", async () => {
  await getXRAGContext({
    selection: { kind: "documentRepository", id: "repo" },
  });
  expect(state.supabase.from).toHaveBeenCalledWith("databases");
  state.create.mockClear();
  claims([{ organization_id: "other", role: "workspace-admin" }]);
  await expect(
    getXRAGContext({ selection: { kind: "documentRepository", id: "repo" } }),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(state.create).not.toHaveBeenCalled();
});
it("uses the established global-admin guard for creating a new workspace", async () => {
  claims("admin");
  await getXRAGContext({
    target: { workspaceId: "new", newWorkspaceName: "New" },
  });
  expect(state.global).toHaveBeenCalledTimes(1);
  expect(state.create).not.toHaveBeenCalled();
});
it("allows model export only after reading the model with the caller's scoped client", async () => {
  await getXRAGContext({ selection: { kind: "model", id: "model" } });
  expect(state.model).toHaveBeenCalledWith("model", {
    supabase: state.supabase,
  });
  state.create.mockClear();
  state.model.mockRejectedValueOnce(new Error("not accessible"));
  await expect(
    getXRAGContext({ selection: { kind: "model", id: "secret" } }),
  ).rejects.toThrow("not accessible");
  expect(state.create).not.toHaveBeenCalled();
});
it("denies editors and unauthenticated callers before privileged access", async () => {
  claims([{ organization_id: "workspace", role: "editor" }]);
  await expect(getXRAGContext({})).rejects.toThrow("NOT_AUTHORIZED");
  state.supabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
  await expect(getXRAGContext({})).rejects.toThrow();
  expect(state.create).not.toHaveBeenCalled();
});
it("validates uploaded paths before privileged access", async () => {
  await expect(
    getXRAGContext({ source: { path: `${userId}/../../private` } }),
  ).rejects.toThrow();
  expect(state.create).not.toHaveBeenCalled();
});
