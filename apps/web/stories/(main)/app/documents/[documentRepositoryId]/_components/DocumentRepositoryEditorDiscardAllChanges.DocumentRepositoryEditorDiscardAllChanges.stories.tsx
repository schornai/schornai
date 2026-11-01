import { openDialog } from "../../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryEditorDiscardAllChanges } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditorDiscardAllChanges";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryEditorDiscardAllChanges",
  component: DocumentRepositoryEditorDiscardAllChanges,
  args: {},
} satisfies Meta<typeof DocumentRepositoryEditorDiscardAllChanges>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const ConfirmationOpened: Story = {
  parameters: {
    contextFixtures: {
      useDocumentRepositoryEditor: {
        documentRepository: { name: "Geändert" },
        defaultDocumentRepository: { name: "Beispiel" },
      },
    },
  },
  play: openDialog,
};

export const Unchanged: Story = {
  tags: ["state-coverage"],
  parameters: {
    contextFixtures: {
      useDocumentRepositoryEditor: {
        documentRepository: { name: "Beispiel" },
        defaultDocumentRepository: { name: "Beispiel" },
      },
    },
  },
};

export const Changed: Story = {
  tags: ["state-coverage"],
  parameters: {
    contextFixtures: {
      useDocumentRepositoryEditor: {
        documentRepository: { name: "Geändert" },
        defaultDocumentRepository: { name: "Beispiel" },
      },
    },
  },
};
