import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkspaceEditorSSOMappings } from "../../../../../app/(settings)/settings/workspace/_components/WorkspaceEditorSSOMappings";

const meta = {
  title: "Web/(settings)/settings/workspace/WorkspaceEditorSSOMappings",
  component: WorkspaceEditorSSOMappings,
  args: {
    defaultSamlMappingUser: "Beispiel",
    defaultSamlMappingEditor: "Beispiel",
    defaultSamlMappingWorkspaceAdmin: "Beispiel",
    workspaceId: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof WorkspaceEditorSSOMappings>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DefaultSamlMappingUser_missing: Story = {
  args: { defaultSamlMappingUser: undefined },
};
export const DefaultSamlMappingEditor_missing: Story = {
  args: { defaultSamlMappingEditor: undefined },
};
export const DefaultSamlMappingWorkspaceAdmin_missing: Story = {
  args: { defaultSamlMappingWorkspaceAdmin: undefined },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
