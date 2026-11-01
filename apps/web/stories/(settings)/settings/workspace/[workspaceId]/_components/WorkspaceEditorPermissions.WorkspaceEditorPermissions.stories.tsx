import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkspaceEditorPermissions } from "../../../../../../app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditorPermissions";

const meta = {
  tags: ["async-component"],
  title:
    "Web/(settings)/settings/workspace/[workspaceId]/WorkspaceEditorPermissions",
  component: WorkspaceEditorPermissions,
  args: { workspaceId: "11111111-1111-4111-8111-111111111111" },
} satisfies Meta<typeof WorkspaceEditorPermissions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { scenario: "empty" } };
