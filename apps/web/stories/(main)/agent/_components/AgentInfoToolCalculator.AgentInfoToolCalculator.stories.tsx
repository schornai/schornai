import { openDisclosure } from "../../../../.storybook/interaction-helpers";
import { repeatFixtures } from "../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentInfoToolCalculator } from "../../../../app/(main)/agent/_components/AgentInfoToolCalculator";

const meta = {
  title: "Web/(main)/agent/AgentInfoToolCalculator",
  component: AgentInfoToolCalculator,
  args: {
    agentRole: {
      documentRepositoryMounts: [
        {
          documentRepositoryIdentifier: "11111111-1111-4111-8111-111111111111",
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
  },
} satisfies Meta<typeof AgentInfoToolCalculator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AgentRole_missing: Story = { args: { agentRole: undefined } };
export const AgentRoleDocumentRepositoryMountsEmpty: Story = {
  args: {
    agentRole: { ...meta.args["agentRole"], documentRepositoryMounts: [] },
  },
};
export const AgentRoleDocumentRepositoryMountsMultiple: Story = {
  args: {
    agentRole: {
      ...meta.args["agentRole"],
      documentRepositoryMounts: repeatFixtures(
        meta.args["agentRole"]["documentRepositoryMounts"],
      ),
    },
  },
};
export const AgentRoleMcpsEmpty: Story = {
  args: { agentRole: { ...meta.args["agentRole"], mcps: [] } },
};
export const AgentRoleMcpsMultiple: Story = {
  args: {
    agentRole: {
      ...meta.args["agentRole"],
      mcps: repeatFixtures(meta.args["agentRole"]["mcps"]),
    },
  },
};
export const AgentRoleToolWebAccessWebFetchAllowListEmpty: Story = {
  args: {
    agentRole: {
      ...meta.args["agentRole"],
      toolWebAccess: {
        ...meta.args["agentRole"]["toolWebAccess"],
        webFetchAllowList: [],
      },
    },
  },
};
export const AgentRoleToolWebAccessWebFetchAllowListMultiple: Story = {
  args: {
    agentRole: {
      ...meta.args["agentRole"],
      toolWebAccess: {
        ...meta.args["agentRole"]["toolWebAccess"],
        webFetchAllowList: repeatFixtures(
          meta.args["agentRole"]["toolWebAccess"]["webFetchAllowList"],
        ),
      },
    },
  },
};
export const Opened: Story = { play: openDisclosure };
