import { repeatFixtures } from "../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentIconGroupInfos } from "../../../../app/(main)/agent/_components/AgentIconGroupInfos";

const meta = {
  title: "Web/(main)/agent/AgentIconGroupInfos",
  component: AgentIconGroupInfos,
  args: {
    agent: {
      description: "Eine Beschreibung für Storybook.",
      id: "11111111-1111-4111-8111-111111111111",
      name: "Beispiel",
      workspaceId: "11111111-1111-4111-8111-111111111111",
      additionalFunctions: {
        batch: false,
        disappearingChats: false,
        fileUpload: false,
        nightshift: false,
        pursueGoal: false,
      },
      color: { oklchHue: 284, type: "color-oklch-hue" },
      documentation: "Beispiel",
      icon: { iconName: "bot", type: "icon-lucide" },
      modelIdentifier: "example-model",
      modelThinking: "mandatory-on",
      recommendedMessages: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          message: "Beispiel",
          label: "Beispiel",
        },
      ],
      roles: [
        {
          documentRepositoryMounts: [
            {
              documentRepositoryIdentifier:
                "11111111-1111-4111-8111-111111111111",
              id: "11111111-1111-4111-8111-111111111111",
              mount: "Beispiel",
              pathRepository: "/",
              permission: "read-only",
            },
          ],
          id: "11111111-1111-4111-8111-111111111111",
          prompt: "Beantworte die Frage verständlich.",
          mcps: [
            {
              headers: {},
              id: "11111111-1111-4111-8111-111111111111",
              type: "http",
              url: "/brand/squared.png",
              name: "Beispiel",
            },
          ],
          modelIdentifierOverride: "11111111-1111-4111-8111-111111111111",
          modelThinkingOverride: "mandatory-on",
          name: "Beispiel",
          roleSelectionHint: "Beispiel",
          toolCalculator: { active: false },
          toolChatAwareness: {
            active: false,
            recommendNextMessages: false,
            updateChatLabel: false,
          },
          toolWebAccess: {
            active: false,
            webFetchAccess: "allow-all",
            webFetchAllowList: ["Beispiel"],
            webFetch: "on",
            webSearch: "on",
          },
        },
      ],
      version: "agent-config-version-4",
    },
    documentRepositoryMap: new Map(),
    model: {
      type: "ollama_llm_v1",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      identifier: "11111111-1111-4111-8111-111111111111",
      config: {
        contextSize: 1,
        featureThinking: false,
        featureTools: false,
        featureVision: false,
        ollamaIdentifier: "11111111-1111-4111-8111-111111111111",
      },
    },
    workspace: {
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      documentation: "Beispiel",
      autoJoin: false,
      samlMappingUser: "Beispiel",
      samlMappingEditor: "Beispiel",
      samlMappingWorkspaceAdmin: "Beispiel",
      claim: "admin",
    },
  },
} satisfies Meta<typeof AgentIconGroupInfos>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Model_ollama_llm_v1_ollama_llm_v1: Story = { args: {} };
export const Model_external_llm_v1_external_llm_v1: Story = {
  args: {
    model: {
      type: "external_llm_v1",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      identifier: "11111111-1111-4111-8111-111111111111",
      config: {
        modelId: "mistral-small-latest",
        baseUrl: "https://api.mistral.ai/v1",
        headers: {},
        provider: "mistral",
      },
    },
  },
};
export const Model_ollama_embedding_v1_ollama_embedding_v1: Story = {
  args: {
    model: {
      type: "ollama_embedding_v1",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      identifier: "11111111-1111-4111-8111-111111111111",
      config: {
        contextSize: 1,
        embeddingVectorSize: 384,
        ollamaIdentifier: "11111111-1111-4111-8111-111111111111",
      },
    },
  },
};
export const Model_mlx_whisper_v1_mlx_whisper_v1: Story = {
  args: {
    model: {
      type: "mlx_whisper_v1",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      identifier: "11111111-1111-4111-8111-111111111111",
      config: { fileSystemIdentifier: "11111111-1111-4111-8111-111111111111" },
    },
  },
};
export const Agent_missing: Story = { args: { agent: undefined } };
export const Model_missing: Story = { args: { model: undefined } };
export const Workspace_missing: Story = { args: { workspace: undefined } };
export const AgentRecommendedMessagesEmpty: Story = {
  args: { agent: { ...meta.args["agent"], recommendedMessages: [] } },
};
export const AgentRecommendedMessagesMultiple: Story = {
  args: {
    agent: {
      ...meta.args["agent"],
      recommendedMessages: repeatFixtures(
        meta.args["agent"]["recommendedMessages"],
      ),
    },
  },
};
export const AgentRolesEmpty: Story = {
  args: { agent: { ...meta.args["agent"], roles: [] } },
};
export const AgentRolesMultiple: Story = {
  args: {
    agent: {
      ...meta.args["agent"],
      roles: repeatFixtures(meta.args["agent"]["roles"]),
    },
  },
};
