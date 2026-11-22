import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryEditorOverview } from "../../../../../../app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryEditorOverview";

const meta = {
  title:
    "Web/(main)/app/documents/[documentRepositoryId]/DocumentRepositoryEditorOverview",
  component: DocumentRepositoryEditorOverview,
  args: {
    mode: "create",
  },
} satisfies Meta<typeof DocumentRepositoryEditorOverview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Mode_create: Story = { args: {} };
export const Mode_update: Story = { args: { mode: "update" } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
