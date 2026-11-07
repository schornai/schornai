import { beforeEach, describe, expect, it, vi } from "vitest";
const io = vi.hoisted(() => ({
  grant: vi.fn(),
  user: vi.fn(),
  claims: vi.fn(),
  workspaces: vi.fn(),
  client: vi.fn(),
  service: { auth: { admin: { getUserById: vi.fn() } } },
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: () => io.service,
}));
vi.mock("@schornio/aibox-package-database/platformMcp/getGrant", () => ({
  getGrant: io.grant,
}));
vi.mock("@schornio/aibox-package-database/user/buildAccessToken", () => ({
  buildAccessToken: io.claims,
}));
vi.mock("@schornio/aibox-package-database/workspace/getWorkspaces", () => ({
  getWorkspaces: io.workspaces,
}));
vi.mock("@schornio/aibox-package-database/auth/createClientWithClaims", () => ({
  createClientWithClaims: io.client,
}));
import { authenticatePlatformMcp } from "../apps/web/lib/platformMcp/authenticate";
import { hashCredential } from "../apps/web/lib/platformMcp/oauth";
const token = "a".repeat(43),
  resource = "https://box.test/mcp";
const request = (authorization?: string) =>
  new Request(resource, { headers: authorization ? { authorization } : {} });
beforeEach(() => {
  vi.clearAllMocks();
  io.grant.mockResolvedValue({
    user_id: "user",
    access_level: "user",
    redirect_uri: "https://client.test/callback",
  });
  io.service.auth.admin.getUserById.mockResolvedValue({
    data: { user: { id: "user", app_metadata: { trusted: true } } },
    error: null,
  });
  io.claims.mockResolvedValue("admin");
  io.workspaces.mockResolvedValue([{ id: "workspace" }]);
  io.client.mockResolvedValue({ scoped: true });
});
describe("platform MCP bearer authentication", () => {
  it.each([
    undefined,
    "Basic secret",
    "Bearer short",
    "Bearer " + "a".repeat(44),
    "Bearer " + "/".repeat(43),
  ])("rejects malformed header %s before accessing grants", async (header) => {
    expect(await authenticatePlatformMcp(request(header), resource)).toBeNull();
    expect(io.grant).not.toHaveBeenCalled();
  });
  it("hashes the credential, binds the resource and caps administrator claims for user consent", async () => {
    expect(
      await authenticatePlatformMcp(request(`Bearer ${token}`), resource),
    ).toMatchObject({
      userId: "user",
      level: "user",
      claims: [{ organization_id: "workspace", role: "user" }],
      clientOrigin: "https://client.test",
      supabase: { scoped: true },
    });
    expect(io.grant).toHaveBeenCalledWith(hashCredential(token), resource, {
      supabase: io.service,
    });
    expect(io.claims).toHaveBeenCalledWith(
      { user_id: "user", claims: { app_metadata: { trusted: true } } },
      { supabaseServiceRole: io.service },
    );
    expect(io.client).toHaveBeenCalledWith(
      "user",
      [{ organization_id: "workspace", role: "user" }],
      expect.anything(),
    );
  });
  it.each([null, { access_level: "unknown" }])(
    "refuses missing grants or grants with an invalid level",
    async (grant) => {
      io.grant.mockResolvedValue(grant);
      expect(
        await authenticatePlatformMcp(request(`Bearer ${token}`), resource),
      ).toBeNull();
      expect(io.client).not.toHaveBeenCalled();
    },
  );
  it.each([
    { data: { user: null }, error: null },
    { data: { user: { id: "user" } }, error: new Error("auth") },
    {
      data: { user: { id: "user", banned_until: "2999-01-01T00:00:00Z" } },
      error: null,
    },
  ])("rejects absent, banned or unverifiable users", async (result) => {
    io.service.auth.admin.getUserById.mockResolvedValue(result);
    expect(
      await authenticatePlatformMcp(request(`Bearer ${token}`), resource),
    ).toBeNull();
    expect(io.claims).not.toHaveBeenCalled();
  });
  it("rechecks current membership, accepts expired bans and never promotes a workspace member", async () => {
    io.service.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: "user", banned_until: "2000-01-01T00:00:00Z" } },
      error: null,
    });
    io.claims.mockResolvedValue([
      { organization_id: "workspace", role: "editor" },
    ]);
    expect(
      await authenticatePlatformMcp(request(`Bearer ${token}`), resource),
    ).toMatchObject({
      claims: [{ organization_id: "workspace", role: "user" }],
    });
    expect(io.workspaces).not.toHaveBeenCalled();
    io.claims.mockResolvedValue([]);
    await expect(
      authenticatePlatformMcp(request(`Bearer ${token}`), resource),
    ).rejects.toThrow("NOT_AUTHORIZED");
  });
  it("keeps explicit global administrator scope only with explicit admin consent", async () => {
    io.grant.mockResolvedValue({
      user_id: "user",
      access_level: "admin",
      redirect_uri: "https://client.test/callback",
    });
    expect(
      await authenticatePlatformMcp(request(`Bearer ${token}`), resource),
    ).toMatchObject({ claims: "admin" });
    expect(io.workspaces).not.toHaveBeenCalled();
  });
});

it("reduces a previously granted admin token to the current editor role", async () => {
  io.grant.mockResolvedValue({
    user_id: "user",
    access_level: "admin",
    redirect_uri: "https://client.test/callback",
  });
  io.claims.mockResolvedValue([
    { organization_id: "workspace", role: "editor" },
  ]);
  expect(
    await authenticatePlatformMcp(request(`Bearer ${token}`), resource),
  ).toMatchObject({
    level: "editor",
    claims: [{ organization_id: "workspace", role: "editor" }],
  });
});
