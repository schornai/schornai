import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryEditorSettingsDescription } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditorSettingsDescription";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryEditorSettingsDescription",
  component: DocumentRepositoryEditorSettingsDescription,
  args: {},
} satisfies Meta<typeof DocumentRepositoryEditorSettingsDescription>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
