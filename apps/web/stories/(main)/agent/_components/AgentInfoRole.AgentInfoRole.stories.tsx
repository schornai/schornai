import { repeatFixtures } from "../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentInfoRole } from "../../../../app/(main)/agent/_components/AgentInfoRole";

const meta = {
  title: "Web/(main)/agent/AgentInfoRole",
  component: AgentInfoRole,
  args: {
    documentRepositoryMap: new Map(),
    editable: false,
    editAgentPathname: "/",
    editDefaultRole: {
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
    modelMap: new Map(),
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
} satisfies Meta<typeof AgentInfoRole>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Editable_false: Story = { args: {} };
export const Editable_true: Story = { args: { editable: true } };
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
export const Editable_missing: Story = { args: { editable: undefined } };
export const EditAgentPathname_missing: Story = {
  args: { editAgentPathname: undefined },
};
export const EditDefaultRole_missing: Story = {
  args: { editDefaultRole: undefined },
};
export const ModelMap_missing: Story = { args: { modelMap: undefined } };
export const EditDefaultRoleDocumentRepositoryMountsEmpty: Story = {
  args: {
    editDefaultRole: {
      ...meta.args["editDefaultRole"],
      documentRepositoryMounts: [],
    },
  },
};
export const EditDefaultRoleDocumentRepositoryMountsMultiple: Story = {
  args: {
    editDefaultRole: {
      ...meta.args["editDefaultRole"],
      documentRepositoryMounts: repeatFixtures(
        meta.args["editDefaultRole"]["documentRepositoryMounts"],
      ),
    },
  },
};
export const EditDefaultRoleMcpsEmpty: Story = {
  args: { editDefaultRole: { ...meta.args["editDefaultRole"], mcps: [] } },
};
export const EditDefaultRoleMcpsMultiple: Story = {
  args: {
    editDefaultRole: {
      ...meta.args["editDefaultRole"],
      mcps: repeatFixtures(meta.args["editDefaultRole"]["mcps"]),
    },
  },
};
export const EditDefaultRoleToolWebAccessWebFetchAllowListEmpty: Story = {
  args: {
    editDefaultRole: {
      ...meta.args["editDefaultRole"],
      toolWebAccess: {
        ...meta.args["editDefaultRole"]["toolWebAccess"],
        webFetchAllowList: [],
      },
    },
  },
};
export const EditDefaultRoleToolWebAccessWebFetchAllowListMultiple: Story = {
  args: {
    editDefaultRole: {
      ...meta.args["editDefaultRole"],
      toolWebAccess: {
        ...meta.args["editDefaultRole"]["toolWebAccess"],
        webFetchAllowList: repeatFixtures(
          meta.args["editDefaultRole"]["toolWebAccess"]["webFetchAllowList"],
        ),
      },
    },
  },
};
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
