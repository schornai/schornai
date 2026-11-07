import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  execute: vi.fn(),
  revalidate: vi.fn(),
  context: vi.fn(),
  readOnly: false,
}));
vi.mock("../apps/web/lib/platformMcp/authenticate", () => ({
  authenticatePlatformMcp: mocks.authenticate,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@schornio/aibox-realtime/server/getRealtimeServerToken", () => ({
  getRealtimeServerToken: () => "Worker test",
}));
vi.mock(
  "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
vi.mock("@schornio/aibox-realtime/platform/tools", () => ({
  createPlatformTools: (context: unknown) => {
    mocks.context(context);
    return [
      {
        name: "platform_test",
        description: "Test",
        readOnly: mocks.readOnly,
        inputSchema: { type: "object", properties: {} },
        execute: mocks.execute,
      },
    ];
  },
}));
import {
  platformMcpHandler,
  platformMcpOptions,
} from "../apps/web/lib/platformMcp/handleRequest";
import { GET as resourceMetadata } from "../apps/web/app/.well-known/oauth-protected-resource/[...path]/route";

const handler = platformMcpHandler("user");
function request(method: string, params = {}, origin?: string) {
  return new Request("https://example.test/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-11-25",
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.readOnly = false;
  mocks.authenticate.mockResolvedValue({
    userId: "user",
    claims: "admin",
    level: "user",
  });
  mocks.execute.mockResolvedValue({ saved: true });
});
describe("platform MCP HTTP transport", () => {
  it("challenges unauthenticated clients without redirecting to HTML login", async () => {
    mocks.authenticate.mockResolvedValue(null);
    const response = await handler(request("tools/list"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain(
      "/.well-known/oauth-protected-resource/mcp",
    );
    expect(response.headers.get("Location")).toBeNull();
  });
  it("rejects origins outside the server and consented client", async () => {
    expect(
      (await handler(request("tools/list", {}, "https://evil.test"))).status,
    ).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("initializes using the actual SDK transport", async () => {
    const response = await handler(
      request("initialize", {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).result.serverInfo.name).toBe("schornai");
  });
  it("lists and executes tools and invalidates affected UI data", async () => {
    const listed = await handler(request("tools/list"));
    expect((await listed.json()).result.tools[0].name).toBe("platform_test");
    const response = await handler(
      request("tools/call", { name: "platform_test", arguments: {} }),
    );
    expect((await response.json()).result.content[0].text).toBe(
      '{"saved":true}',
    );
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
  });
  it("does not expose raw database errors", async () => {
    mocks.execute.mockRejectedValue(new Error("secret=private-token"));
    const response = await handler(
      request("tools/call", { name: "platform_test", arguments: {} }),
    );
    const body = await response.json();
    expect(body.result.isError).toBe(true);
    expect(JSON.stringify(body)).not.toContain("private-token");
  });
  it("publishes exact resource metadata for all four levels", async () => {
    for (const path of [
      ["mcp"],
      ["mcp", "editor"],
      ["mcp", "workspace"],
      ["mcp", "admin"],
    ]) {
      const response = await resourceMetadata(
        new Request(
          "https://example.test/.well-known/oauth-protected-resource/" +
            path.join("/"),
        ),
        { params: Promise.resolve({ path }) },
      );
      expect((await response.json()).resource).toBe(
        "https://example.test/" + path.join("/"),
      );
    }
  });
});

it("returns forbidden when current authorization cannot be established", async () => {
  mocks.authenticate.mockRejectedValue(new Error("private auth detail"));
  const response = await handler(request("tools/list"));
  expect(response.status).toBe(403);
  expect(await response.text()).toBe("");
});
it("rejects unsupported HTTP methods after authentication", async () => {
  const response = await handler(new Request("https://example.test/mcp"));
  expect(response.status).toBe(405);
  expect(response.headers.get("Allow")).toBe("POST");
});
it("reports unknown tools without invoking an operation", async () => {
  const response = await handler(request("tools/call", { name: "missing" }));
  expect((await response.json()).result).toMatchObject({
    isError: true,
    content: [{ text: "UNKNOWN_TOOL" }],
  });
  expect(mocks.execute).not.toHaveBeenCalled();
});
it("handles no-argument read operations without invalidating UI routes", async () => {
  mocks.readOnly = true;
  mocks.execute.mockResolvedValue(undefined);
  const response = await handler(
    request("tools/call", { name: "platform_test" }),
  );
  expect((await response.json()).result.content[0].text).toBe(
    '{"success":true}',
  );
  expect(mocks.execute).toHaveBeenCalledWith({});
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
it.each(["https://example.test", "https://client.test"])(
  "accepts the server or authorized client origin %s",
  async (origin) => {
    mocks.authenticate.mockResolvedValue({
      userId: "user",
      claims: "admin",
      level: "user",
      clientOrigin: "https://client.test",
    });
    const response = await handler(request("tools/list", {}, origin));
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  },
);
it("provides preflight headers for external MCP clients", () => {
  const response = platformMcpOptions();
  expect(response.status).toBe(204);
  expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
    "Authorization",
  );
  expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
    "POST",
  );
});
it("only supplies server SSO credentials when configured", async () => {
  await handler(request("tools/list"));
  const { getSsoConfig } = mocks.context.mock.calls[0][0];
  try {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(getSsoConfig).toThrow("SSO_NOT_CONFIGURED");
    vi.stubEnv("SUPABASE_URL", "https://database.test");
    expect(getSsoConfig).toThrow("SSO_NOT_CONFIGURED");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only");
    expect(getSsoConfig()).toEqual({
      supabaseUrl: "https://database.test",
      supabaseServiceRoleKey: "server-only",
    });
  } finally {
    vi.unstubAllEnvs();
  }
});
