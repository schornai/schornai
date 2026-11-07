import { beforeEach, expect, it, vi } from "vitest";
const io = vi.hoisted(() => ({
  exchange: vi.fn(),
  refresh: vi.fn(),
  grant: vi.fn(),
  revoke: vi.fn(),
  client: { auth: { admin: { getUserById: vi.fn() } } },
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: () => io.client,
}));
vi.mock("@schornio/aibox-package-database/platformMcp/exchangeCode", () => ({
  exchangeCode: io.exchange,
}));
vi.mock("@schornio/aibox-package-database/platformMcp/getGrant", () => ({
  getGrant: io.grant,
}));
vi.mock("@schornio/aibox-package-database/platformMcp/refreshTokens", () => ({
  refreshTokens: io.refresh,
}));
vi.mock("@schornio/aibox-package-database/platformMcp/revokeGrant", () => ({
  revokeGrant: io.revoke,
}));
import { POST } from "../apps/web/app/api/platform-mcp/token/route";
import { hashCredential } from "../apps/web/lib/platformMcp/oauth";
const fields = {
  grant_type: "authorization_code",
  client_id: "11111111-1111-4111-8111-111111111111",
  code: "a".repeat(43),
  code_verifier: "b".repeat(43),
  redirect_uri: "https://client.test/callback",
  resource: "https://box.test/mcp",
};
const request = (values: Record<string, string> = fields) =>
  new Request("https://box.test/api/platform-mcp/token", {
    method: "POST",
    body: new URLSearchParams(values),
  });
beforeEach(() => {
  vi.clearAllMocks();
  io.client.auth.admin.getUserById.mockResolvedValue({
    data: { user: { id: "user" } },
    error: null,
  });
  io.exchange.mockResolvedValue("editor");
  io.refresh.mockResolvedValue("editor");
  io.grant.mockResolvedValue({
    access_level: "editor",
    access_expires_at: new Date(Date.now() + 3600000).toISOString(),
  });
});
it.each(["user", "editor", "workspace", "admin"])(
  "reports the consented %s scope rather than requested scope",
  async (scope) => {
    io.grant.mockResolvedValue({
      access_level: scope,
      access_expires_at: new Date(Date.now() + 3600000).toISOString(),
    });
    const result = await POST(request());
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body).toMatchObject({
      scope,
      token_type: "Bearer",
      expires_in: expect.any(Number),
    });
    expect(io.exchange).toHaveBeenCalledWith(
      expect.objectContaining({
        p_resource: fields.resource,
        p_challenge: hashCredential(fields.code_verifier),
        p_access_hash: hashCredential(body.access_token),
        p_refresh_hash: hashCredential(body.refresh_token),
      }),
      { supabase: io.client },
    );
    expect(io.grant).toHaveBeenCalledWith(
      hashCredential(body.access_token),
      fields.resource,
      { supabase: io.client },
    );
  },
);
it("does not return a token for failed PKCE, expired or replayed codes", async () => {
  io.exchange.mockResolvedValue(false);
  expect(await (await POST(request())).json()).toEqual({
    error: "invalid_grant",
  });
  expect(io.grant).not.toHaveBeenCalled();
});
it("does not return a token if its grant was concurrently revoked", async () => {
  io.grant.mockResolvedValue(null);
  expect(await (await POST(request())).json()).toEqual({
    error: "invalid_grant",
  });
});
it("sanitizes exchange failures and rejects unsupported grants", async () => {
  io.exchange.mockRejectedValue(new Error("private"));
  expect(await (await POST(request())).json()).toEqual({
    error: "invalid_request",
  });
  expect(
    (await POST(request({ ...fields, grant_type: "refresh_token" }))).status,
  ).toBe(400);
});

const refreshFields = {
  grant_type: "refresh_token",
  client_id: fields.client_id,
  refresh_token: "r".repeat(43),
  resource: fields.resource,
};
it("rotates refresh credentials without requiring another authorization code", async () => {
  const result = await POST(request(refreshFields));
  expect(result.status).toBe(200);
  const body = await result.json();
  expect(body.refresh_token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(body.refresh_token).not.toBe(refreshFields.refresh_token);
  expect(body.access_token).not.toBe(body.refresh_token);
  expect(body.expires_in).toBeGreaterThanOrEqual(3598);
  expect(body.expires_in).toBeLessThanOrEqual(3600);
  expect(io.exchange).not.toHaveBeenCalled();
  expect(io.refresh).toHaveBeenCalledWith(
    {
      p_client_id: fields.client_id,
      p_refresh_hash: hashCredential(refreshFields.refresh_token),
      p_access_hash: hashCredential(body.access_token),
      p_next_refresh_hash: hashCredential(body.refresh_token),
      p_resource: fields.resource,
    },
    { supabase: io.client },
  );
  expect(result.headers.get("Cache-Control")).toBe("no-store");
});
it("preserves requested scope for server-side validation and rejects invalid refreshes", async () => {
  io.refresh.mockResolvedValue(null);
  const result = await POST(request({ ...refreshFields, scope: "admin" }));
  expect(await result.json()).toEqual({ error: "invalid_grant" });
  expect(io.refresh).toHaveBeenCalledWith(
    expect.objectContaining({ p_scope: "admin" }),
    expect.anything(),
  );
  expect(io.grant).not.toHaveBeenCalled();
});
it("does not advertise a lifetime beyond the original consent deadline", async () => {
  io.grant.mockResolvedValue({
    access_level: "editor",
    access_expires_at: new Date(Date.now() + 10000).toISOString(),
  });
  const result = await (await POST(request(refreshFields))).json();
  expect(result.expires_in).toBeLessThanOrEqual(10);
});
it("sanitizes refresh failures", async () => {
  io.refresh.mockRejectedValue(new Error("secret token"));
  expect(await (await POST(request(refreshFields))).json()).toEqual({
    error: "invalid_request",
  });
});

it.each([
  { data: { user: null }, error: null },
  {
    data: { user: { id: "user", banned_until: "2999-01-01T00:00:00Z" } },
    error: null,
  },
  { data: { user: null }, error: new Error("private") },
])(
  "revokes the entire grant if the account cannot be authorized",
  async (user) => {
    io.client.auth.admin.getUserById.mockResolvedValue(user);
    expect(await (await POST(request(refreshFields))).json()).toEqual({
      error: "invalid_grant",
    });
    expect(io.revoke).toHaveBeenCalledWith(
      expect.any(String),
      fields.client_id,
      { supabase: io.client },
    );
  },
);

it("renews through the real MCP SDK and server routes without showing consent again", async () => {
  const { auth } = await import("@ai-sdk/mcp");
  const { GET: metadata } =
    await import("../apps/web/app/.well-known/oauth-authorization-server/route");
  const { GET: resourceMetadata } =
    await import("../apps/web/app/.well-known/oauth-protected-resource/[...path]/route");
  let tokens: any;
  let verifier = "";
  let authorizationServer: any;
  let authorizationUrl: URL | undefined;
  const redirect = vi.fn(async (url: URL) => {
    authorizationUrl = url;
  });
  const provider = {
    redirectUrl: fields.redirect_uri,
    clientMetadata: {
      redirect_uris: [fields.redirect_uri],
      token_endpoint_auth_method: "none" as const,
    },
    clientInformation: () => ({ client_id: fields.client_id }),
    tokens: () => tokens,
    saveTokens: async (next: any) => {
      tokens = next;
    },
    state: () => "test-state",
    redirectToAuthorization: redirect,
    saveCodeVerifier: async (next: string) => {
      verifier = next;
    },
    codeVerifier: () => verifier,
    authorizationServerInformation: () => authorizationServer,
    saveAuthorizationServerInformation: async (next: any) => {
      authorizationServer = next;
    },
  };
  const fetchFn = vi.fn(async (input: any, init?: RequestInit) => {
    const req = new Request(String(input), init);
    const path = new URL(req.url).pathname;
    if (path === "/.well-known/oauth-authorization-server")
      return metadata(req);
    if (path === "/.well-known/oauth-protected-resource/mcp")
      return resourceMetadata(req, {
        params: Promise.resolve({ path: ["mcp"] }),
      });
    if (path === "/api/platform-mcp/token") return POST(req);
    return new Response(null, { status: 404 });
  });
  // Use loopback URLs for SDK endpoint validation; no real network requests run.
  const serverUrl = "http://localhost:3003/mcp";
  expect(await auth(provider, { serverUrl, fetchFn })).toBe("REDIRECT");
  expect(authorizationUrl?.searchParams.get("code_challenge_method")).toBe(
    "S256",
  );
  expect(
    await auth(provider, {
      serverUrl,
      fetchFn,
      authorizationCode: fields.code,
      callbackState: "test-state",
      callbackIssuer: "http://localhost:3003",
    }),
  ).toBe("AUTHORIZED");
  const originalRefresh = tokens.refresh_token;
  expect(originalRefresh).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(await auth(provider, { serverUrl, fetchFn })).toBe("AUTHORIZED");
  expect(tokens.refresh_token).not.toBe(originalRefresh);
  expect(redirect).toHaveBeenCalledTimes(1);
  expect(io.refresh).toHaveBeenCalledWith(
    expect.objectContaining({
      p_refresh_hash: hashCredential(originalRefresh),
      p_resource: serverUrl,
    }),
    expect.anything(),
  );
});
