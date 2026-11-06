import { beforeEach, expect, it, vi } from "vitest";
import { database } from "../helpers/supabase";
const state = vi.hoisted(() => ({
  db: undefined as any,
  service: undefined as any,
  claims: [] as any,
  elevate: vi.fn(),
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => state.db,
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: state.elevate,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { createAgent } from "../../apps/web/app/(main)/agent/_actions/createAgent";
import { updateAgent } from "../../apps/web/app/(main)/agent/_actions/updateAgent";
import { mapAgent } from "../../packages/database/src/agent/_mappers";
import { getAgentMCPHeaders } from "../../packages/database/src/agent/getAgentMCPHeaders";

const mcp = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "http",
  url: "https://mcp.test",
  headers: { Authorization: null },
} as const;
const config = {
  version: "agent-config-version-4",
  color: { type: "color-oklch-hue", oklchHue: 100 },
  icon: { type: "icon-lucide", iconName: "bot" },
  documentation: "",
  modelIdentifier: "model",
  modelThinking: "optional-on",
  additionalFunctions: {
    batch: true,
    disappearingChats: true,
    fileUpload: true,
    nightshift: true,
    pursueGoal: true,
  },
  recommendedMessages: [],
  roles: [
    { id: "role", prompt: "", documentRepositoryMounts: [], mcps: [mcp] },
  ],
} as const;
const saved: any = {
  id: "source",
  organization_id: "source-workspace",
  name: "Source",
  description: "",
  config,
};
const agent = {
  ...config,
  id: "source",
  workspaceId: "target-workspace",
  name: "Changed",
  description: "",
};
beforeEach(() => {
  vi.clearAllMocks();
  state.claims = ["source-workspace", "target-workspace"].map(
    (organization_id) => ({ organization_id, role: "workspace-admin" }),
  );
  state.db = database({ chatbots: { data: saved } }).supabase;
  state.db.auth = {
    getClaims: async () => ({
      data: { claims: { organization_roles: state.claims } },
      error: null,
    }),
  };
  state.service = database().supabase;
  state.elevate.mockReturnValue(state.service);
});
it.each(["user", "editor"])(
  "denies %s before obtaining a privileged client",
  async (role) => {
    state.claims = [{ organization_id: "target-workspace", role }];
    await expect(createAgent({ agent })).rejects.toThrow("NOT_AUTHORIZED");
    await expect(updateAgent({ agent })).rejects.toThrow("NOT_AUTHORIZED");
    expect(state.elevate).not.toHaveBeenCalled();
  },
);
it.each(["source-workspace", "target-workspace"])(
  "requires administration of both workspaces, not only %s",
  async (organization_id) => {
    state.claims = [{ organization_id, role: "workspace-admin" }];
    await expect(updateAgent({ agent })).rejects.toThrow("NOT_AUTHORIZED");
    await expect(
      createAgent({ agent, copyFromAgentId: "source" }),
    ).rejects.toThrow("NOT_AUTHORIZED");
    expect(state.elevate).not.toHaveBeenCalled();
  },
);
it("binds authorized update and copy operations to the saved source workspace", async () => {
  await updateAgent({ agent });
  expect(state.service.rpc).toHaveBeenLastCalledWith(
    "save_agent_with_mcp_credentials",
    expect.objectContaining({
      p_expected_workspace_id: "source-workspace",
      p_workspace_id: "target-workspace",
    }),
  );
  await createAgent({ agent, copyFromAgentId: "source" });
  expect(state.service.rpc).toHaveBeenLastCalledWith(
    "save_agent_with_mcp_credentials",
    expect.objectContaining({
      p_copy_agent_id: "source",
      p_copy_workspace_id: "source-workspace",
    }),
  );
});
it("allows global administrators and creates new agents without inferring a copy from an input ID", async () => {
  state.claims = "admin";
  await createAgent({ agent });
  expect(state.service.rpc).toHaveBeenLastCalledWith(
    "save_agent_with_mcp_credentials",
    expect.objectContaining({ p_copy_agent_id: undefined }),
  );
});
it("redacts even legacy headers in the public agent mapper", () => {
  const row = structuredClone(saved);
  row.config.roles[0].mcps[0].headers.Authorization = "private-token";
  const result = mapAgent(row);
  expect(result.roles[0]?.mcps?.[0]?.headers).toEqual({ Authorization: null });
  expect(JSON.stringify(result)).not.toContain("private-token");
});
it("loads only the authorized saved role, MCP, endpoint and requested header names", async () => {
  const { supabase, builders } = database({
    agent_mcp_credentials: {
      data: {
        headers: { Authorization: "private-token", "X-Removed": "removed" },
      },
    },
  });
  expect(
    await getAgentMCPHeaders("agent", "role", mcp, {
      supabaseServiceRole: supabase as any,
    }),
  ).toEqual({ Authorization: "private-token" });
  for (const pair of [
    ["agent_id", "agent"],
    ["role_id", "role"],
    ["mcp_id", mcp.id],
    ["url", mcp.url],
  ])
    expect(builders.agent_mcp_credentials!.eq).toHaveBeenCalledWith(...pair);
});
it("fails closed without forwarding database errors or accepting missing saved values", async () => {
  for (const response of [
    { error: { message: "private-token" } },
    { data: { headers: {} } },
  ]) {
    const { supabase } = database({ agent_mcp_credentials: response });
    await expect(
      getAgentMCPHeaders("agent", "role", mcp, {
        supabaseServiceRole: supabase as any,
      }),
    ).rejects.toThrow(/^MCP_CREDENTIALS_UNAVAILABLE$/);
  }
});
