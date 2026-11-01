import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkspaceEditorDescription } from "../../../../../app/(settings)/settings/workspace/_components/WorkspaceEditorDescription";

const meta = {
  title: "Web/(settings)/settings/workspace/WorkspaceEditorDescription",
  component: WorkspaceEditorDescription,
  args: {
    defaultDescription: "Beispiel",
    defaultName: "Beispiel",
    workspaceId: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof WorkspaceEditorDescription>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DefaultDescription_missing: Story = {
  args: { defaultDescription: undefined },
};
export const DefaultName_missing: Story = { args: { defaultName: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
