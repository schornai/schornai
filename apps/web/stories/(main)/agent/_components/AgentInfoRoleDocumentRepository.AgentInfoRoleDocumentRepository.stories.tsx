import { openDisclosure } from "../../../../.storybook/interaction-helpers";
import { repeatFixtures } from "../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentInfoRoleDocumentRepository } from "../../../../app/(main)/agent/_components/AgentInfoRoleDocumentRepository";

const meta = {
  title: "Web/(main)/agent/AgentInfoRoleDocumentRepository",
  component: AgentInfoRoleDocumentRepository,
  args: {
    documentRepositoryMounts: [
      {
        documentRepositoryIdentifier: "11111111-1111-4111-8111-111111111111",
        id: "11111111-1111-4111-8111-111111111111",
        mount: "Beispiel",
        pathRepository: "/",
        permission: "read-only",
      },
    ],
    documentRepositoryMap: new Map(),
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
    editRoleId: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof AgentInfoRoleDocumentRepository>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DocumentRepositoryMap_missing: Story = {
  args: { documentRepositoryMap: undefined },
};
export const EditAgentPathname_missing: Story = {
  args: { editAgentPathname: undefined },
};
export const EditDefaultRole_missing: Story = {
  args: { editDefaultRole: undefined },
};
export const EditRoleId_missing: Story = { args: { editRoleId: undefined } };
export const DocumentRepositoryMountsEmpty: Story = {
  args: { documentRepositoryMounts: [] },
};
export const DocumentRepositoryMountsMultiple: Story = {
  args: {
    documentRepositoryMounts: repeatFixtures(
      meta.args["documentRepositoryMounts"],
    ),
  },
};
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
export const Opened: Story = { play: openDisclosure };
