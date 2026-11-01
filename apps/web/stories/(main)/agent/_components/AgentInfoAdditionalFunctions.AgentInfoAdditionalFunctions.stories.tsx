import { repeatFixtures } from "../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentInfoAdditionalFunctions } from "../../../../app/(main)/agent/_components/AgentInfoAdditionalFunctions";

const meta = {
  title: "Web/(main)/agent/AgentInfoAdditionalFunctions",
  component: AgentInfoAdditionalFunctions,
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
    editAgentPathname: "/",
    editable: false,
  },
} satisfies Meta<typeof AgentInfoAdditionalFunctions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Editable_false: Story = { args: {} };
export const Editable_true: Story = { args: { editable: true } };
export const Agent_missing: Story = { args: { agent: undefined } };
export const EditAgentPathname_missing: Story = {
  args: { editAgentPathname: undefined },
};
export const Editable_missing: Story = { args: { editable: undefined } };
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
