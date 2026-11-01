import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ agent: vi.fn(), connection: vi.fn() }));
vi.mock("../packages/database/src/agent/getAgentById.ts", () => ({
  getAgentById: mocks.agent,
}));
vi.mock(
  "../packages/database/src/connections/getConnectionCredentials.ts",
  () => ({ getConnectionCredentials: mocks.connection }),
);
import { getMCPOAuthClient } from "../packages/database/src/mcp/getMCPOAuthClient";
const options = { supabase: {} as never };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.agent.mockResolvedValue({
    roles: [
      {
        mcps: [
          { id: "mcp", url: "https://mcp.test", oauthConnectionId: "shared" },
        ],
      },
    ],
  });
  mocks.connection.mockResolvedValue({
    kind: "oauth",
    client_id: "client",
    secret: "secret",
    version: "version",
  });
});
it("resolves only the configured agent reference and exposes version for token invalidation", async () => {
  expect(
    await getMCPOAuthClient("agent", "mcp", "https://mcp.test", options),
  ).toEqual({
    client_id: "client",
    client_secret: "secret",
    version: "version",
  });
  expect(mocks.connection).toHaveBeenCalledWith("shared", options);
});
it("never resolves credentials for a different agent MCP endpoint", async () => {
  await expect(
    getMCPOAuthClient("agent", "mcp", "https://evil.test", options),
  ).rejects.toThrow();
  expect(mocks.connection).not.toHaveBeenCalled();
});
it("rejects removed references and search keys", async () => {
  for (const connection of [
    null,
    { kind: "brave" },
    { kind: "oauth", client_id: "client", secret: null },
    { kind: "oauth", client_id: "client", secret: "   " },
    { kind: "oauth", client_id: null, secret: "secret" },
  ]) {
    mocks.connection.mockResolvedValue(connection);
    await expect(
      getMCPOAuthClient("agent", "mcp", "https://mcp.test", options),
    ).rejects.toThrow("MCP_OAUTH_CONNECTION_UNAVAILABLE");
  }
});
it("allows dynamic registration without a selected app", async () => {
  mocks.agent.mockResolvedValue({
    roles: [{ mcps: [{ id: "mcp", url: "https://mcp.test" }] }],
  });
  expect(
    await getMCPOAuthClient("agent", "mcp", "https://mcp.test", options),
  ).toBeNull();
  expect(mocks.connection).not.toHaveBeenCalled();
});

it("reuses an OAuth app for a different saved MCP endpoint", async () => {
  mocks.agent.mockResolvedValue({
    roles: [
      {
        mcps: [
          {
            id: "other",
            url: "https://other.test/mcp",
            oauthConnectionId: "shared",
          },
        ],
      },
    ],
  });
  expect(
    await getMCPOAuthClient(
      "agent",
      "other",
      "https://other.test/mcp",
      options,
    ),
  ).toMatchObject({ client_id: "client", client_secret: "secret" });
  expect(mocks.connection).toHaveBeenCalledWith("shared", options);
});
