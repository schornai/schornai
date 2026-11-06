import { beforeEach, expect, it, vi } from "vitest";
import { authorizeMCP } from "../../apps/web/lib/mcp/authorizeMCP";
import { getAgentById } from "../../packages/database/src/agent/getAgentById";
import { createSupabaseServerClient } from "../../apps/web/lib/supabase/createSupabaseServerClient";

vi.mock("../../packages/database/src/agent/getAgentById", () => ({
  getAgentById: vi.fn(),
}));
vi.mock("../../apps/web/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: vi.fn(),
}));
let supabase: any;
beforeEach(() => {
  vi.resetAllMocks();
  supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user" } } }),
    },
  };
  vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase);
});

it("requires a signed-in user before loading agent configuration", async () => {
  supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
  await expect(authorizeMCP("agent", "mcp")).rejects.toThrow(
    "Authentication required",
  );
  expect(getAgentById).not.toHaveBeenCalled();
});

it("authorizes against the user's agent access and returns only a configured MCP", async () => {
  const mcp = { id: "mcp", url: "https://connector.test/mcp" };
  const agent = {
    roles: [{}, { mcps: [{ id: "other", url: "https://other.test" }, mcp] }],
  } as any;
  vi.mocked(getAgentById).mockResolvedValue(agent);
  await expect(authorizeMCP("agent", "mcp")).resolves.toEqual({
    user: { id: "user" },
    mcp,
    agent,
  });
  expect(getAgentById).toHaveBeenCalledWith("agent", { supabase });
  await expect(authorizeMCP("agent", "missing")).rejects.toThrow(
    "MCP unavailable",
  );
});

it("propagates denied agent access without authorizing a connector", async () => {
  vi.mocked(getAgentById).mockRejectedValue(new Error("agent not found"));
  await expect(authorizeMCP("agent", "mcp")).rejects.toThrow("agent not found");
});

it.each([
  "http://connector.test",
  "https://user@connector.test",
  "https://:password@connector.test",
  "https://connector.test/#fragment",
])("rejects unsafe OAuth endpoint %s", async (url) => {
  vi.mocked(getAgentById).mockResolvedValue({
    roles: [{ mcps: [{ id: "mcp", url }] }],
  } as any);
  await expect(authorizeMCP("agent", "mcp")).rejects.toThrow(
    "OAuth requires an HTTPS MCP URL",
  );
});
