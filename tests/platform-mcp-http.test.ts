import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  execute: vi.fn(),
  revalidate: vi.fn(),
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
  createPlatformTools: () => [
    {
      name: "platform_test",
      description: "Test",
      readOnly: false,
      inputSchema: { type: "object", properties: {} },
      execute: mocks.execute,
    },
  ],
}));
import { platformMcpHandler } from "../apps/web/lib/platformMcp/handleRequest";
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
