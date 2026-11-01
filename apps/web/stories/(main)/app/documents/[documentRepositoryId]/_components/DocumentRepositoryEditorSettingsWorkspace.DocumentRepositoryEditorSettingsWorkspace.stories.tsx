import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryEditorSettingsWorkspace } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditorSettingsWorkspace";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryEditorSettingsWorkspace",
  component: DocumentRepositoryEditorSettingsWorkspace,
  args: {},
} satisfies Meta<typeof DocumentRepositoryEditorSettingsWorkspace>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
