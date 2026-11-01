import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: { id: "alice" } as { id: string } | null,
  redirectUrl: "https://box.test/api/mcp/oauth/callback",
  authorize: vi.fn(),
  pending: vi.fn(),
  consume: vi.fn(),
  auth: vi.fn(),
  load: vi.fn(),
  prepare: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
  }),
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: () => ({}),
}));
vi.mock("@/lib/mcp/pendingApproval", () => ({
  pendingMCPApproval: mocks.pending,
}));
vi.mock("@/lib/mcp/authorizeMCP", () => ({ authorizeMCP: mocks.authorize }));
vi.mock("@schornio/aibox-package-database/mcp/consumeMCPOAuthState", () => ({
  consumeMCPOAuthState: mocks.consume,
}));
vi.mock("@ai-sdk/mcp", () => ({
  auth: mocks.auth,
  createMCPClient: mocks.create,
}));
vi.mock("@schornio/aibox-realtime/mcp/MCPOAuthProvider", () => ({
  MCPOAuthProvider: class {
    static load = mocks.load;
    useConfiguredClient = vi.fn();
    redirectUrl = mocks.redirectUrl;
    authorizationOptions = {
      serverUrl: "https://mcp.test/v1",
      resourceMetadataUrl: new URL(
        "https://mcp.test/.well-known/oauth-protected-resource/search_threads",
      ),
      scope: "gmail.readonly",
    };
    loginContext = {
      agentId: "agent",
      mcpId: "mcp",
      returnTo: "/agent/agent/chat",
      activityId: "chat",
      approvalId: "approval",
    };
  },
}));
vi.mock("next-i18next/server", () => ({
  getT: async () => ({ t: (key: string) => key }),
}));
import { POST } from "../apps/web/app/api/mcp/oauth/route";
import { GET } from "../apps/web/app/api/mcp/oauth/callback/route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.pending.mockResolvedValue(undefined);
  mocks.user = { id: "alice" };
  mocks.redirectUrl = "https://box.test/api/mcp/oauth/callback";
  mocks.authorize.mockResolvedValue({
    user: mocks.user,
    mcp: { url: "https://mcp.test/v1", headers: {} },
  });
  mocks.consume.mockResolvedValue({ server_url: "https://mcp.test/v1" });
  mocks.auth.mockResolvedValue("AUTHORIZED");
  mocks.load.mockResolvedValue({
    prepareLogin: mocks.prepare,
    authorizationOptions: {
      serverUrl: "https://mcp.test/v1",
      resourceMetadataUrl: new URL(
        "https://mcp.test/.well-known/oauth-protected-resource/search_threads",
      ),
      scope: "gmail.readonly",
    },
    authorizationUrl: new URL("https://auth.test/authorize"),
  });
  mocks.create.mockRejectedValue(new Error("Redirect"));
});
function start(origin = "https://box.test") {
  return new Request("https://box.test/api/mcp/oauth", {
    method: "POST",
    headers: { origin },
    body: new URLSearchParams({
      agentId: "agent",
      mcpId: "mcp",
      returnTo: "https://evil.test",
    }),
  });
}
it("rejects cross-origin login before accessing credentials", async () => {
  expect((await POST(start("https://evil.test"))).status).toBe(403);
  expect(mocks.load).not.toHaveBeenCalled();
});
it("authorizes agent access and restricts return URLs before redirecting", async () => {
  const response = await POST(start());
  expect(response.status).toBe(303);
  expect(mocks.authorize).toHaveBeenCalledWith("agent", "mcp");
  expect(mocks.load).toHaveBeenCalledWith(
    "alice",
    "https://mcp.test/v1",
    expect.anything(),
  );
  expect(mocks.prepare).toHaveBeenCalledWith(
    expect.objectContaining({ returnTo: "/agent/agent" }),
  );
});
it("never forwards raw upstream errors", async () => {
  mocks.authorize.mockRejectedValue(new Error("secret-provider-token"));
  const response = await POST(start());
  expect(response.status).toBe(400);
  expect(await response.text()).not.toContain("secret-provider-token");
  expect(mocks.load).not.toHaveBeenCalled();
});
it("requires login and state before exchanging a code", async () => {
  mocks.user = null;
  expect(
    (
      await GET(
        new Request("https://box.test/api/mcp/oauth/callback?state=x&code=c"),
      )
    ).status,
  ).toBe(400);
  expect(mocks.consume).not.toHaveBeenCalled();
  expect(mocks.auth).not.toHaveBeenCalled();
});
it("consumes state for the current user and rechecks endpoint access", async () => {
  const response = await GET(
    new Request(
      "https://box.test/api/mcp/oauth/callback?state=x&code=c&iss=https%3A%2F%2Fauth.test",
    ),
  );
  expect(response.status).toBe(303);
  expect(mocks.consume).toHaveBeenCalledWith("alice", "x", expect.anything());
  expect(mocks.authorize).toHaveBeenCalledWith("agent", "mcp");
  expect(mocks.auth).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      callbackState: "x",
      callbackIssuer: "https://auth.test",
    }),
  );
});
it("rejects changed endpoints, rejected state and declined consent without token exchange", async () => {
  mocks.consume.mockResolvedValue({ server_url: "https://changed.test" });
  expect(
    (
      await GET(
        new Request("https://box.test/api/mcp/oauth/callback?state=x&code=c"),
      )
    ).status,
  ).toBe(400);
  mocks.consume.mockRejectedValue(new Error("Expired or replayed"));
  expect(
    (
      await GET(
        new Request("https://box.test/api/mcp/oauth/callback?state=x&code=c"),
      )
    ).status,
  ).toBe(400);
  expect(mocks.auth).not.toHaveBeenCalled();
});
it("consumes declined consent without exchanging a token", async () => {
  const response = await GET(
    new Request(
      "https://box.test/api/mcp/oauth/callback?state=x&error=access_denied",
    ),
  );
  expect(response.status).toBe(400);
  expect(mocks.consume).toHaveBeenCalledWith("alice", "x", expect.anything());
  expect(mocks.auth).not.toHaveBeenCalled();
});

const proxyHeaders = {
  "x-forwarded-host": "localhost:3000",
  "x-forwarded-proto": "https",
  "x-forwarded-port": "443",
};
it("starts OAuth behind the HTTPS proxy and preserves its external port", async () => {
  const response = await POST(
    new Request("http://localhost:3003/api/mcp/oauth", {
      method: "POST",
      headers: { ...proxyHeaders, origin: "https://localhost:3000" },
      body: new URLSearchParams({
        agentId: "agent",
        mcpId: "mcp",
        returnTo: "/agent/agent/chat",
        activityId: "chat",
        approvalId: "approval",
      }),
    }),
  );
  expect(response.status).toBe(303);
  expect(mocks.prepare).toHaveBeenCalledWith(
    expect.objectContaining({
      redirectUrl: "https://localhost:3000/api/mcp/oauth/callback",
      returnTo: "/agent/agent/chat",
      activityId: "chat",
      approvalId: "approval",
    }),
  );
});
it("still rejects cross-origin POSTs behind the proxy", async () => {
  const response = await POST(
    new Request("http://localhost:3003/api/mcp/oauth", {
      method: "POST",
      headers: { ...proxyHeaders, origin: "https://evil.test" },
    }),
  );
  expect(response.status).toBe(403);
  expect(mocks.authorize).not.toHaveBeenCalled();
});
it("validates and returns from the callback using the same external origin", async () => {
  mocks.redirectUrl = "https://localhost:3000/api/mcp/oauth/callback";
  const response = await GET(
    new Request("http://localhost:3003/api/mcp/oauth/callback?state=x&code=c", {
      headers: proxyHeaders,
    }),
  );
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(
    "https://localhost:3000/agent/agent/chat",
  );
});
it.each([
  {
    "x-forwarded-host": "localhost:3000, evil.test",
    "x-forwarded-proto": "https",
  },
  { "x-forwarded-host": "evil.test/path", "x-forwarded-proto": "https" },
  { "x-forwarded-host": "localhost:3000", "x-forwarded-proto": "https,http" },
  { "x-forwarded-host": "localhost:3000" },
])(
  "rejects ambiguous forwarded origins before authorizing",
  async (headers) => {
    const response = await POST(
      new Request("http://localhost:3003/api/mcp/oauth", {
        method: "POST",
        headers: { ...headers, origin: "https://localhost:3000" },
      }),
    );
    expect(response.status).toBe(403);
    expect(mocks.authorize).not.toHaveBeenCalled();
  },
);

it("does not start OAuth for a stale or unauthorized approval", async () => {
  mocks.pending.mockRejectedValue(new Error("Approval unavailable"));
  expect((await POST(start())).status).toBe(400);
  expect(mocks.load).not.toHaveBeenCalled();
});
it("automatically resumes only the approval bound to consumed OAuth state", async () => {
  expect(
    (
      await GET(
        new Request("https://box.test/api/mcp/oauth/callback?state=x&code=c"),
      )
    ).status,
  ).toBe(303);
  expect(mocks.pending).toHaveBeenCalledWith(
    {
      agentId: "agent",
      activityId: "chat",
      approvalId: "approval",
      mcpId: "mcp",
    },
    true,
  );
  expect(mocks.auth.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.pending.mock.invocationCallOrder[0]!,
  );
});

it("explains missing registered OAuth app credentials without exposing upstream data", async () => {
  mocks.load.mockResolvedValue({ prepareLogin: mocks.prepare });
  mocks.auth.mockRejectedValue(
    new Error("wrapper", {
      cause: new Error(
        "Incompatible auth server: does not support dynamic client registration",
      ),
    }),
  );
  const response = await POST(start());
  expect(response.status).toBe(400);
  expect(await response.text()).toBe("errorClientRequired");
});
it("explains a missing configured OAuth app", async () => {
  mocks.load.mockRejectedValue(new Error("MCP_OAUTH_CONNECTION_UNAVAILABLE"));
  expect(await (await POST(start())).text()).toBe("errorClientRequired");
});

it("starts tool-specific OAuth without replaying the pending tool or resuming before consent", async () => {
  mocks.auth.mockResolvedValue("REDIRECT");
  const response = await POST(start());
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("https://auth.test/authorize");
  expect(mocks.auth).toHaveBeenCalledWith(expect.anything(), {
    serverUrl: "https://mcp.test/v1",
    resourceMetadataUrl: new URL(
      "https://mcp.test/.well-known/oauth-protected-resource/search_threads",
    ),
    scope: "gmail.readonly",
  });
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.pending).toHaveBeenCalledTimes(1);
});
