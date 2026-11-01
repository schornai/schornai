import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryEditorSettingsAppearance } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditorSettingsAppearance";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryEditorSettingsAppearance",
  component: DocumentRepositoryEditorSettingsAppearance,
  args: {},
} satisfies Meta<typeof DocumentRepositoryEditorSettingsAppearance>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
