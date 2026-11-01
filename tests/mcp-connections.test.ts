import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: { id: "alice" } as { id: string } | null,
  remove: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
  }),
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: () => ({}),
}));
vi.mock(
  "@schornio/aibox-package-database/mcp/deleteMCPOAuthConnection",
  () => ({ deleteMCPOAuthConnection: mocks.remove }),
);
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { disconnectMCP } from "../apps/web/app/(settings)/me/connections/_actions/disconnectMCP";
import { listMCPOAuthConnections } from "../packages/database/src/mcp/listMCPOAuthConnections";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "alice" };
});
it("only disconnects the authenticated user's connection", async () => {
  await disconnectMCP({ serverUrl: "https://mcp.test", userId: "bob" } as any);
  expect(mocks.remove).toHaveBeenCalledWith(
    "alice",
    "https://mcp.test",
    expect.anything(),
  );
  expect(mocks.revalidate).toHaveBeenCalledWith("/me/connections");
});
it("requires authentication before deleting", async () => {
  mocks.user = null;
  expect(
    (await disconnectMCP({ serverUrl: "https://mcp.test" }))?.serverError,
  ).toBe("INTERNAL_SERVER_ERROR");
  expect(mocks.remove).not.toHaveBeenCalled();
});
it("only selects non-secret metadata for the current user", async () => {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    not: vi.fn(() => query),
    order: vi.fn(async () => ({
      data: [{ server_url: "https://mcp.test" }],
      error: null,
    })),
  };
  const supabase: any = { from: vi.fn(() => query) };
  expect(await listMCPOAuthConnections("alice", { supabase })).toEqual([
    { server_url: "https://mcp.test" },
  ]);
  expect(query.select).toHaveBeenCalledWith("server_url");
  expect(query.eq).toHaveBeenCalledWith("user_id", "alice");
});
