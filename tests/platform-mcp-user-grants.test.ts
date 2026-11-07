import { beforeEach, expect, it, vi } from "vitest";
import { database } from "./helpers/supabase";
import { listUserGrants } from "../packages/database/src/platformMcp/listUserGrants";
import { revokeUserGrant } from "../packages/database/src/platformMcp/revokeUserGrant";
import { createPlatformTools } from "../packages/realtime/src/platform/tools";
const io = vi.hoisted(() => ({
  user: vi.fn(),
  service: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: io.user } }),
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: io.service,
}));
vi.mock("next/cache", () => ({ revalidatePath: io.revalidate }));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
import { revokePlatformMcp } from "../apps/web/app/(settings)/me/connections/_actions/revokePlatformMcp";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => vi.clearAllMocks());
it("lists only issued grants of the authenticated owner without credential fields", async () => {
  const db = database({
    platform_mcp_grants: {
      data: [
        {
          id,
          access_level: "user",
          resource: "https://box/mcp",
          created_at: "2026-11-01",
          access_expires_at: "2026-11-01T01:00:00Z",
          refresh_expires_at: "2026-12-01",
          platform_mcp_clients: { name: "Assistant" },
        },
      ],
    },
  });
  db.builders.platform_mcp_grants.not = vi.fn(
    () => db.builders.platform_mcp_grants,
  );
  expect(
    await listUserGrants("owner", { supabase: db.supabase as any }),
  ).toEqual([
    {
      id,
      name: "Assistant",
      level: "user",
      resource: "https://box/mcp",
      createdAt: "2026-11-01",
      expiresAt: "2026-12-01",
    },
  ]);
  expect(db.builders.platform_mcp_grants.eq).toHaveBeenCalledWith(
    "user_id",
    "owner",
  );
  expect(db.builders.platform_mcp_grants.not).toHaveBeenCalledWith(
    "access_hash",
    "is",
    null,
  );
  expect(db.builders.platform_mcp_grants.select.mock.calls[0][0]).not.toMatch(
    /hash|challenge|token/,
  );
});
it("uses both owner and grant predicates for deletion", async () => {
  const db = database({ platform_mcp_grants: { data: null } });
  await revokeUserGrant("owner", id, { supabase: db.supabase as any });
  expect(db.builders.platform_mcp_grants.eq.mock.calls).toEqual([
    ["user_id", "owner"],
    ["id", id],
  ]);
});
it("authenticates the action before creating the privileged client", async () => {
  io.user.mockResolvedValue({ data: { user: null }, error: null });
  await expect((revokePlatformMcp as any)({ grantId: id })).rejects.toThrow();
  expect(io.service).not.toHaveBeenCalled();
});
it("ignores a forged owner and invalidates the user's page after success", async () => {
  const db = database({ platform_mcp_grants: { data: null } });
  io.user.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  io.service.mockReturnValue(db.supabase);
  await (revokePlatformMcp as any)({ grantId: id, userId: "victim" });
  expect(db.builders.platform_mcp_grants.eq.mock.calls).toEqual([
    ["user_id", "owner"],
    ["id", id],
  ]);
  expect(io.revalidate).toHaveBeenCalledWith("/me/connections");
});
it("uses the same owner-bound operation through MCP and never accepts another owner", async () => {
  const db = database({ platform_mcp_grants: { data: null } });
  const tools = createPlatformTools({
    userId: "owner",
    claims: "admin",
    level: "user",
    supabaseServiceRole: db.supabase,
  } as any);
  await tools
    .find((t) => t.name === "platform_personal_mcp_revoke")!
    .execute({ grantId: id, userId: "victim" });
  expect(db.builders.platform_mcp_grants.eq.mock.calls).toEqual([
    ["user_id", "owner"],
    ["id", id],
  ]);
  expect(
    tools.find((t) => t.name === "platform_personal_mcp_grants")?.readOnly,
  ).toBe(true);
});
it("sanitizes backend errors", async () => {
  const db = database({
    platform_mcp_grants: { error: new Error("private details") },
  });
  db.builders.platform_mcp_grants.not = vi.fn(
    () => db.builders.platform_mcp_grants,
  );
  await expect(
    listUserGrants("owner", { supabase: db.supabase as any }),
  ).rejects.toThrow("MCP_GRANTS_LIST_FAILED");
  await expect(
    revokeUserGrant("owner", id, { supabase: db.supabase as any }),
  ).rejects.toThrow("MCP_GRANT_REVOCATION_FAILED");
});
