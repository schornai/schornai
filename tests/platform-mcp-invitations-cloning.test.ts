import { beforeEach, expect, it, vi } from "vitest";
import { createPlatformTools } from "../packages/realtime/src/platform/tools";
import type { PlatformContext } from "../packages/realtime/src/platform/registry";
const io = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
  config: vi.fn(),
}));
vi.mock("@schornio/aibox-database/agent/getAgentById", () => ({
  getAgentById: io.get,
}));
vi.mock("@schornio/aibox-database/agent/createAgent", () => ({
  createAgent: io.create,
}));
vi.mock("@schornio/aibox-database/config/getSystemConfig", () => ({
  getSystemConfig: io.config,
}));
const agent = {
  id: "source",
  name: "Agent 2",
  description: "",
  workspaceId: "target",
  version: "agent-config-version-4",
  additionalFunctions: {},
  color: { type: "color-oklch-hue", oklchHue: 250 },
  icon: { type: "icon-lucide", iconName: "bot" },
  documentation: "",
  modelIdentifier: "model",
  modelThinking: "optional-on",
  recommendedMessages: [],
  roles: [
    {
      id: "role",
      prompt: "Help",
      documentRepositoryMounts: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          documentRepositoryIdentifier: "repository-2",
          permission: "read-only",
        },
      ],
      mcps: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          type: "http",
          url: "https://mcp.example",
          headers: { Authorization: null },
        },
      ],
    },
  ],
};
function tool(
  name: string,
  claims: PlatformContext["claims"] = "admin",
  level: PlatformContext["level"] = "admin",
) {
  return createPlatformTools({
    claims,
    level,
    supabase: {},
    supabaseServiceRole: {},
  } as PlatformContext).find((t) => t.name === name)!;
}
beforeEach(() => {
  vi.resetAllMocks();
  io.get.mockResolvedValue({ id: "source", workspaceId: "source-workspace" });
  io.create.mockResolvedValue({ agentId: "clone" });
});
it("clones retained credentials server-side with authorized source and target and an added mount", async () => {
  const result = await tool(
    "platform_agent_create",
    [
      { organization_id: "source-workspace", role: "workspace-admin" },
      { organization_id: "target", role: "workspace-admin" },
    ],
    "workspace",
  ).execute({ agent, copyFromAgentId: "source" });
  expect(result).toEqual({ agentId: "clone" });
  expect(io.get).toHaveBeenCalledWith("source", { supabase: {} });
  expect(io.create).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Agent 2",
      roles: expect.arrayContaining([
        expect.objectContaining({
          mcps: agent.roles[0]!.mcps,
          documentRepositoryMounts: expect.arrayContaining([
            expect.objectContaining({
              documentRepositoryIdentifier: "repository-2",
            }),
          ]),
        }),
      ]),
    }),
    {
      supabaseServiceRole: {},
      copyFrom: { agentId: "source", workspaceId: "source-workspace" },
    },
  );
});
it.each(["source-workspace", "target"])(
  "rejects cloning without admin rights in %s",
  async (denied) => {
    const claims = ["source-workspace", "target"].map((organization_id) => ({
      organization_id,
      role:
        organization_id === denied
          ? ("user" as const)
          : ("workspace-admin" as const),
    }));
    await expect(
      tool("platform_agent_create", claims, "workspace").execute({
        agent,
        copyFromAgentId: "source",
      }),
    ).rejects.toThrow("NOT_AUTHORIZED");
    expect(io.create).not.toHaveBeenCalled();
  },
);
const invitation = {
  email: "alice@example.com",
  firstName: " Alice ",
  lastName: " Example ",
  resetKey: "key-$&",
  expires: "2026-11-14T12:00:00Z",
  applicationUrl: "https://schorn.example/",
  language: "de-AT",
  timeZone: "Europe/Vienna",
};
it("renders the configured invitation including every placeholder without issuing a new key", async () => {
  io.config.mockResolvedValue(
    JSON.stringify({
      localized: {
        de: {
          subject: "Zugang für {{fullName}}",
          body: "{{firstName}}|{{lastName}}|{{email}}|{{resetKey}}|{{resetUrl}}|{{expires}}",
        },
      },
    }),
  );
  expect(
    await tool("platform_user_access_message").execute(invitation),
  ).toEqual({
    email: invitation.email,
    resetUrl: "https://schorn.example/signin/reset",
    subject: "Zugang für Alice Example",
    body: `Alice|Example|alice@example.com|key-$&|https://schorn.example/signin/reset|${new Date(invitation.expires).toLocaleString("de-AT", { timeZone: "Europe/Vienna" })}`,
  });
  expect(io.config).toHaveBeenCalledWith("accessMessage", { supabase: {} });
});
it.each([undefined, "broken", '{"localized":42}'])(
  "uses UI defaults for missing or invalid templates: %s",
  async (value) => {
    io.config.mockResolvedValue(value);
    expect(
      await tool("platform_user_access_message").execute(invitation),
    ).toMatchObject({
      subject: "Ihr Zugang zu schorn.ai",
      body: expect.stringContaining("Schlüssel: key-$&"),
    });
  },
);
it("does not expose invitations to workspace administrators", () => {
  expect(
    tool("platform_user_access_message", [
      { organization_id: "target", role: "workspace-admin" },
    ]),
  ).toBeUndefined();
});
it("rejects non-HTTP invitation origins", async () => {
  await expect(
    tool("platform_user_access_message").execute({
      ...invitation,
      applicationUrl: "javascript:alert(1)",
    }),
  ).rejects.toThrow();
});
