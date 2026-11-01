import { openDialog } from "../../../../.storybook/interaction-helpers";
import { repeatFixtures } from "../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorRoleSettings } from "../../../../app/(main)/agent/_components/AgentEditorRoleSettings";

const meta = {
  title: "Web/(main)/agent/AgentEditorRoleSettings",
  component: AgentEditorRoleSettings,
  args: {
    role: {
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
} satisfies Meta<typeof AgentEditorRoleSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Role_modelThinkingOverride_mandatory_on: Story = { args: {} };
export const Role_modelThinkingOverride_optional_on: Story = {
  args: {
    role: {
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
      modelThinkingOverride: "optional-on",
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
};
export const Role_modelThinkingOverride_mandatory_off: Story = {
  args: {
    role: {
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
      modelThinkingOverride: "mandatory-off",
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
};
export const Role_modelThinkingOverride_optional_off: Story = {
  args: {
    role: {
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
      modelThinkingOverride: "optional-off",
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
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const RoleDocumentRepositoryMountsEmpty: Story = {
  args: { role: { ...meta.args["role"], documentRepositoryMounts: [] } },
};
export const RoleDocumentRepositoryMountsMultiple: Story = {
  args: {
    role: {
      ...meta.args["role"],
      documentRepositoryMounts: repeatFixtures(
        meta.args["role"]["documentRepositoryMounts"],
      ),
    },
  },
};
export const RoleMcpsEmpty: Story = {
  args: { role: { ...meta.args["role"], mcps: [] } },
};
export const RoleMcpsMultiple: Story = {
  args: {
    role: {
      ...meta.args["role"],
      mcps: repeatFixtures(meta.args["role"]["mcps"]),
    },
  },
};
export const RoleToolWebAccessWebFetchAllowListEmpty: Story = {
  args: {
    role: {
      ...meta.args["role"],
      toolWebAccess: {
        ...meta.args["role"]["toolWebAccess"],
        webFetchAllowList: [],
      },
    },
  },
};
export const RoleToolWebAccessWebFetchAllowListMultiple: Story = {
  args: {
    role: {
      ...meta.args["role"],
      toolWebAccess: {
        ...meta.args["role"]["toolWebAccess"],
        webFetchAllowList: repeatFixtures(
          meta.args["role"]["toolWebAccess"]["webFetchAllowList"],
        ),
      },
    },
  },
};
export const ConfirmationOpened: Story = { play: openDialog };
