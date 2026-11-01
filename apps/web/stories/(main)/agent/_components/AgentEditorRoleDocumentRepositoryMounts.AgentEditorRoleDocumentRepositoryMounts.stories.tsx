import { openDialog } from "../../../../.storybook/interaction-helpers";
import { repeatFixtures } from "../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorRoleDocumentRepositoryMounts } from "../../../../app/(main)/agent/_components/AgentEditorRoleDocumentRepositoryMounts";

const meta = {
  title: "Web/(main)/agent/AgentEditorRoleDocumentRepositoryMounts",
  component: AgentEditorRoleDocumentRepositoryMounts,
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
    roleId: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof AgentEditorRoleDocumentRepositoryMounts>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
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
export const ConfirmationOpened: Story = { play: openDialog };
