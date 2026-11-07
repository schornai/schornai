import { beforeEach, expect, it, vi } from "vitest";
const io = vi.hoisted(() => ({
  user: vi.fn(),
  claims: vi.fn(),
  grant: vi.fn(),
  client: vi.fn(),
  headers: vi.fn(),
  service: {},
}));
vi.mock("next/headers", () => ({ headers: io.headers }));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({ auth: {} }),
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: () => io.service,
}));
vi.mock("@schornio/aibox-package-database/user/getCurrentUser", () => ({
  getCurrentUser: io.user,
}));
vi.mock("@schornio/aibox-package-database/user/buildAccessToken", () => ({
  buildAccessToken: io.claims,
}));
vi.mock("@schornio/aibox-package-database/platformMcp/createGrant", () => ({
  createGrant: io.grant,
}));
vi.mock("@schornio/aibox-package-database/platformMcp/getClient", () => ({
  getClient: io.client,
}));
import { authorizePlatformMcp } from "../apps/web/app/oauth/authorize/_actions/authorizePlatformMcp";
import { getAuthorizationUser } from "../apps/web/lib/platformMcp/getAuthorizationUser";
const request = {
  client_id: "11111111-1111-4111-8111-111111111111",
  redirect_uri: "https://client.test/callback",
  response_type: "code",
  code_challenge_method: "S256",
  code_challenge: "a".repeat(43),
  resource: "https://box.test/mcp",
  state: "client-state",
};
const authorize = authorizePlatformMcp as any;
beforeEach(() => {
  vi.clearAllMocks();
  io.headers.mockResolvedValue(
    new Headers({
      host: "box.test",
      "x-forwarded-host": "box.test",
      "x-forwarded-proto": "https",
    }),
  );
  io.user.mockResolvedValue({ id: "user", app_metadata: {} });
  io.claims.mockResolvedValue("admin");
  io.client.mockResolvedValue({
    name: "client",
    redirect_uris: [request.redirect_uri],
  });
});
it.each([undefined, "user", "user editor workspace admin"])(
  "stores the explicitly selected level regardless of discovery scope %s",
  async (scope) => {
    const result = await authorize({
      request: { ...request, scope },
      level: "workspace",
      approve: true,
    });
    expect(io.grant).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: request.resource,
        access_level: "workspace",
        user_id: "user",
      }),
      { supabase: io.service },
    );
    const target = new URL(result.redirectUrl);
    expect(target.origin).toBe("https://client.test");
    expect(target.searchParams.get("state")).toBe(request.state);
    expect(target.searchParams.get("code")).toMatch(/^[A-Za-z0-9_-]{43}$/);
  },
);
it("rejects a forged admin selection from an editor before issuing a code", async () => {
  io.claims.mockResolvedValue([{ organization_id: "a", role: "editor" }]);
  expect((await getAuthorizationUser()).levels).toEqual(["user", "editor"]);
  await expect(
    authorize({ request, level: "admin", approve: true }),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(io.grant).not.toHaveBeenCalled();
});
it("rechecks roles when submitting consent", async () => {
  expect((await getAuthorizationUser()).levels).toContain("admin");
  io.claims.mockResolvedValue([{ organization_id: "a", role: "user" }]);
  await expect(
    authorize({ request, level: "workspace", approve: true }),
  ).rejects.toThrow();
  expect(io.grant).not.toHaveBeenCalled();
});
it("allows refusing consent without creating a grant", async () => {
  io.claims.mockResolvedValue([]);
  const result = await authorize({ request, level: "user", approve: false });
  expect(new URL(result.redirectUrl).searchParams.get("error")).toBe(
    "access_denied",
  );
  expect(io.grant).not.toHaveBeenCalled();
});
it.each(["https://box.test/mcp/admin", "https://other.test/mcp"])(
  "rejects a noncanonical resource %s",
  async (resource) => {
    await expect(
      authorize({
        request: { ...request, resource },
        level: "admin",
        approve: true,
      }),
    ).rejects.toThrow("INVALID_RESOURCE");
    expect(io.grant).not.toHaveBeenCalled();
  },
);
it("rejects an unregistered redirect", async () => {
  await expect(
    authorize({
      request: { ...request, redirect_uri: "https://other.test" },
      level: "user",
      approve: true,
    }),
  ).rejects.toThrow("INVALID_CLIENT");
});
it("rejects banned accounts before resolving privileged permissions", async () => {
  io.user.mockResolvedValue({
    id: "user",
    banned_until: "2999-01-01T00:00:00Z",
  });
  await expect(getAuthorizationUser()).rejects.toThrow("NOT_AUTHORIZED");
  expect(io.claims).not.toHaveBeenCalled();
});
