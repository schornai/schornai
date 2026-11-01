import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth, createMCPClient } from "@ai-sdk/mcp";
import {
  MCPOAuthProvider,
  MCPAuthorizationRequired,
} from "../packages/realtime/src/mcp/MCPOAuthProvider";
import type { MCPOAuthSession } from "../packages/database/src/mcp/_types";

vi.mock("@ai-sdk/provider-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ai-sdk/provider-utils")>()),
  fetchWithValidatedEndpoint: vi.fn(async ({ url, init }) =>
    globalThis.fetch(url, init),
  ),
}));
const configured = vi.hoisted(() => ({ value: null as any }));
vi.mock("@schornio/aibox-package-database/mcp/getMCPOAuthClient", () => ({
  getMCPOAuthClient: async () => configured.value,
}));
const store = vi.hoisted(() => new Map<string, MCPOAuthSession>());
vi.mock("@schornio/aibox-package-database/mcp/getMCPOAuthSession", () => ({
  getMCPOAuthSession: async (user: string, url: string) =>
    structuredClone(store.get(`${user}:${url}`) ?? null),
}));
vi.mock("@schornio/aibox-package-database/mcp/saveMCPOAuthSession", () => ({
  saveMCPOAuthSession: async (value: MCPOAuthSession, version?: string) => {
    const key = `${value.user_id}:${value.server_url}`;
    if (store.get(key)?.version !== version)
      throw new Error("MCP connection changed. Please retry.");
    const next = { ...value, version: crypto.randomUUID() };
    store.set(key, structuredClone(next));
    return structuredClone(next);
  },
}));
const serverUrl = "https://mcp.example.test/v1";
const options = { supabase: {} as any, mcpId: "mcp-1", interactive: true };
const login = {
  redirectUrl: "https://box.example.test/api/mcp/oauth/callback",
  returnTo: "/agent/agent-1/chat",
  agentId: "agent-1",
  mcpId: "mcp-1",
};
beforeEach(() => {
  store.clear();
  configured.value = null;
});

describe("per-user MCP OAuth", () => {
  it("isolates users and endpoints and persists refresh tokens across provider instances", async () => {
    const provider = await MCPOAuthProvider.load("alice", serverUrl, options);
    await provider.prepareLogin(login);
    await provider.saveTokens({
      access_token: "alice-token",
      refresh_token: "refresh",
      token_type: "Bearer",
    });
    const restored = await MCPOAuthProvider.load("alice", serverUrl, options);
    expect(restored.tokens()?.access_token).toBe("alice-token");
    expect(
      (await MCPOAuthProvider.load("bob", serverUrl, options)).tokens(),
    ).toBeUndefined();
    expect(
      (
        await MCPOAuthProvider.load("alice", "https://other.test", options)
      ).tokens(),
    ).toBeUndefined();
    await restored.saveTokens({
      access_token: "renewed",
      token_type: "Bearer",
    });
    expect(
      (await MCPOAuthProvider.load("alice", serverUrl, options)).tokens()
        ?.refresh_token,
    ).toBe("refresh");
  });
  it("rejects stale writes rather than overwriting a newer token generation", async () => {
    const first = await MCPOAuthProvider.load("alice", serverUrl, options);
    await first.prepareLogin(login);
    const stale = await MCPOAuthProvider.load("alice", serverUrl, options);
    await first.saveTokens({ access_token: "new", token_type: "Bearer" });
    await expect(
      stale.saveTokens({ access_token: "old", token_type: "Bearer" }),
    ).rejects.toThrow("changed");
    expect(
      (await MCPOAuthProvider.load("alice", serverUrl, options)).tokens()
        ?.access_token,
    ).toBe("new");
  });
  it("asks for browser authorization without disclosing credentials to chat", async () => {
    const provider = await MCPOAuthProvider.load("alice", serverUrl, {
      ...options,
      interactive: false,
    });
    expect(() => provider.clientInformation()).toThrow(
      MCPAuthorizationRequired,
    );
    expect(() => provider.state()).toThrow("MCP_AUTH_REQUIRED:mcp-1");
    expect(() =>
      provider.redirectToAuthorization(
        new URL("https://auth.test/?secret=test"),
      ),
    ).toThrow("MCP_AUTH_REQUIRED:mcp-1");
  });
  it("uses SDK discovery, registration, PKCE, callback exchange and refresh", async () => {
    const fetchFn = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("oauth-protected-resource"))
          return Response.json({
            resource: serverUrl,
            authorization_servers: ["https://auth.example.test"],
            scopes_supported: ["offline_access", "read"],
          });
        if (url.includes(".well-known"))
          return Response.json({
            issuer: "https://auth.example.test",
            authorization_endpoint: "https://auth.example.test/authorize",
            token_endpoint: "https://auth.example.test/token",
            registration_endpoint: "https://auth.example.test/register",
            response_types_supported: ["code"],
            code_challenge_methods_supported: ["S256"],
            token_endpoint_auth_methods_supported: ["none"],
          });
        if (url.endsWith("/register"))
          return Response.json({
            ...JSON.parse(String(init?.body)),
            client_id: "client-1",
          });
        if (url.endsWith("/token")) {
          const body = new URLSearchParams(String(init?.body));
          if (body.get("grant_type") === "authorization_code")
            expect(body.get("code_verifier")).toBeTruthy();
          else expect(body.get("refresh_token")).toBe("refresh-1");
          return Response.json({
            access_token: "access-1",
            refresh_token: "refresh-1",
            token_type: "Bearer",
          });
        }
        throw new Error(`Unexpected request ${url}`);
      },
    );
    const provider = await MCPOAuthProvider.load("alice", serverUrl, options);
    await provider.prepareLogin(login);
    expect(await auth(provider, { serverUrl, fetchFn })).toBe("REDIRECT");
    const url = provider.authorizationUrl!;
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toContain("offline_access");
    const saved = store.get(`alice:${serverUrl}`)!;
    expect(saved.state).toBe(url.searchParams.get("state"));
    expect(new Date(saved.state_expires_at!).getTime()).toBeGreaterThan(
      Date.now(),
    );
    // The route consumes state atomically before supplying this session.
    const callback = new MCPOAuthProvider(saved, options);
    expect(
      await auth(callback, {
        serverUrl,
        authorizationCode: "code-1",
        callbackState: saved.state!,
        callbackIssuer: "https://auth.example.test",
        fetchFn,
      }),
    ).toBe("AUTHORIZED");
    expect(store.get(`alice:${serverUrl}`)?.state).toBeNull();
    const worker = await MCPOAuthProvider.load("alice", serverUrl, {
      ...options,
      interactive: false,
    });
    expect(await auth(worker, { serverUrl, fetchFn })).toBe("AUTHORIZED");
    expect(
      fetchFn.mock.calls.filter(([url]) => String(url).endsWith("/register")),
    ).toHaveLength(1);
  });
});

it("surfaces authorization required through the real HTTP MCP client", async () => {
  const provider = await MCPOAuthProvider.load("alice", serverUrl, {
    ...options,
    interactive: false,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 401 })),
  );
  await expect(
    createMCPClient({
      transport: { type: "http", url: serverUrl, authProvider: provider },
    }),
  ).rejects.toThrow(MCPAuthorizationRequired);
});

it("uses a registered confidential client for PKCE exchange and refresh without DCR", async () => {
  configured.value = {
    client_id: "registered-app",
    client_secret: "app-secret",
    version: "v1",
  };
  const opts = { ...options, agentId: "agent-1" };
  const requests: URLSearchParams[] = [];
  const fetchFn = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("oauth-protected-resource"))
        return Response.json({
          resource: serverUrl,
          authorization_servers: ["https://auth.example.test"],
        });
      if (url.includes(".well-known"))
        return Response.json({
          issuer: "https://auth.example.test",
          authorization_endpoint: "https://auth.example.test/authorize",
          token_endpoint: "https://auth.example.test/token",
          response_types_supported: ["code"],
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["client_secret_post"],
        });
      if (url.endsWith("/token")) {
        const body = new URLSearchParams(String(init?.body));
        requests.push(body);
        expect(body.get("client_id")).toBe("registered-app");
        expect(body.get("client_secret")).toBe("app-secret");
        return Response.json({
          access_token: "access",
          refresh_token: "refresh",
          token_type: "Bearer",
        });
      }
      throw new Error("Unexpected endpoint");
    },
  );
  const provider = await MCPOAuthProvider.load("alice", serverUrl, opts);
  await provider.prepareLogin(login);
  expect(provider.isClientInformationDynamicallyRegistered()).toBe(false);
  expect(await auth(provider, { serverUrl, fetchFn })).toBe("REDIRECT");
  expect(provider.authorizationUrl!.searchParams.get("client_id")).toBe(
    "registered-app",
  );
  expect(provider.authorizationUrl!.href).not.toContain("app-secret");
  const saved = store.get(`alice:${serverUrl}`)!;
  expect(JSON.stringify(saved)).not.toContain("app-secret");
  const callback = new MCPOAuthProvider(saved, options);
  await callback.useConfiguredClient("agent-1", "mcp-1");
  expect(
    await auth(callback, {
      serverUrl,
      fetchFn,
      authorizationCode: "code",
      callbackState: saved.state!,
      callbackIssuer: "https://auth.example.test",
    }),
  ).toBe("AUTHORIZED");
  const worker = await MCPOAuthProvider.load("alice", serverUrl, {
    ...opts,
    interactive: false,
  });
  expect(await auth(worker, { serverUrl, fetchFn })).toBe("AUTHORIZED");
  expect(requests[0]!.get("code_verifier")).toBeTruthy();
  expect(requests[1]!.get("grant_type")).toBe("refresh_token");
  configured.value = { ...configured.value, version: "v2" };
  const changed = await MCPOAuthProvider.load("alice", serverUrl, opts);
  expect(changed.tokens()).toBeUndefined();
  await expect(
    callback.useConfiguredClient("agent-1", "mcp-1"),
  ).rejects.toThrow("configuration changed");
});

it("pauses a protected tool after public discovery and resumes its exact call once after OAuth", async () => {
  const { MCPToolSession } =
    await import("../apps/realtime/src/chat/MCPToolSession");
  configured.value = {
    client_id: "gmail-client",
    client_secret: "secret",
    version: "v1",
  };
  const metadataUrl =
    "https://mcp.example.test/.well-known/oauth-protected-resource/search_threads";
  const attempted: unknown[] = [];
  const completed: unknown[] = [];
  const fetchFn = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === serverUrl) {
        if (init?.method === "DELETE")
          return new Response(null, { status: 204 });
        if (init?.method !== "POST") return new Response(null, { status: 405 });
        const request = JSON.parse(String(init.body));
        if (request.id === undefined)
          return new Response(null, { status: 202 });
        let result: unknown;
        if (request.method === "initialize")
          result = {
            protocolVersion: "2025-03-26",
            capabilities: { tools: {} },
            serverInfo: { name: "Gmail-like", version: "1" },
          };
        else if (request.method === "tools/list")
          result = {
            tools: [
              { name: "search_threads", inputSchema: { type: "object" } },
            ],
          };
        else if (request.method === "tools/call") {
          attempted.push(request.params);
          if (
            new Headers(init.headers).get("authorization") !== "Bearer access"
          )
            return new Response(null, {
              status: 401,
              headers: {
                "www-authenticate": `Bearer resource_metadata="${metadataUrl}", scope="gmail.readonly"`,
              },
            });
          completed.push(request.params);
          result = { content: [{ type: "text", text: "result" }] };
        } else throw new Error("Unexpected MCP method");
        return Response.json({ jsonrpc: "2.0", id: request.id, result });
      }
      if (url === metadataUrl)
        return Response.json({
          resource: serverUrl,
          authorization_servers: ["https://auth.example.test"],
          scopes_supported: ["gmail.readonly"],
        });
      if (url.startsWith("https://auth.example.test/.well-known/"))
        return Response.json({
          issuer: "https://auth.example.test",
          authorization_endpoint: "https://auth.example.test/authorize",
          token_endpoint: "https://auth.example.test/token",
          response_types_supported: ["code"],
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["client_secret_post"],
        });
      if (url === "https://auth.example.test/token")
        return Response.json({
          access_token: "access",
          token_type: "Bearer",
          refresh_token: "refresh",
        });
      throw new Error(`Unexpected endpoint ${url}`);
    },
  );
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
    fetchFn(input, init),
  );
  const servers = [
    {
      id: "mcp-1",
      name: "Gmail",
      type: "http" as const,
      url: serverUrl,
      headers: {},
    },
  ];
  const session = new MCPToolSession(servers, "alice", {} as any, "agent-1");
  const tool = session.tool();
  const execution = { toolCallId: "list", messages: [] };
  expect(await session.approval({ serverId: "mcp-1" }, execution)).toBe(
    "approved",
  );
  await tool.execute!({ serverId: "mcp-1" }, execution as any);
  const input = {
    serverId: "mcp-1",
    toolName: "search_threads",
    arguments: { query: "after:2026/10/23" },
  };
  expect(await session.approval(input, { toolCallId: "search" })).toBe(
    "user-approval",
  );
  expect(completed).toEqual([]);
  await session[Symbol.asyncDispose]();
  const interactive = await MCPOAuthProvider.load("alice", serverUrl, {
    ...options,
    agentId: "agent-1",
  });
  expect(interactive.authorizationOptions.resourceMetadataUrl?.href).toBe(
    metadataUrl,
  );
  await interactive.prepareLogin({
    ...login,
    activityId: "chat",
    approvalId: "approval",
  });
  expect(
    await auth(interactive, { ...interactive.authorizationOptions, fetchFn }),
  ).toBe("REDIRECT");
  expect(interactive.authorizationUrl?.searchParams.get("scope")).toBe(
    "gmail.readonly",
  );
  const saved = store.get(`alice:${serverUrl}`)!;
  const callback = new MCPOAuthProvider(saved, options);
  await callback.useConfiguredClient("agent-1", "mcp-1");
  expect(
    await auth(callback, {
      ...callback.authorizationOptions,
      fetchFn,
      authorizationCode: "code",
      callbackState: saved.state!,
      callbackIssuer: "https://auth.example.test",
    }),
  ).toBe("AUTHORIZED");
  const resumed = new MCPToolSession(servers, "alice", {} as any, "agent-1");
  const resumedTool = resumed.tool();
  const resumedExecution = { toolCallId: "search", messages: [] };
  // The SDK executes an approved pending call directly in the new session.
  await resumedTool.execute!(input, resumedExecution as any);
  expect(attempted).toEqual([
    { name: "search_threads", arguments: input.arguments },
    { name: "search_threads", arguments: input.arguments },
  ]);
  expect(completed).toHaveLength(1);
  // New calls attempt execution in approval and reuse the result in execute.
  expect(await resumed.approval(input, { toolCallId: "next" })).toBe(
    "approved",
  );
  await resumedTool.execute!(input, {
    ...resumedExecution,
    toolCallId: "next",
  } as any);
  expect(completed).toHaveLength(2);
  await resumed[Symbol.asyncDispose]();
});
