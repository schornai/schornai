import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkspaceEditPermissionListTable } from "../../../../../../app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditPermissionListTable";

const meta = {
  title:
    "Web/(settings)/settings/workspace/[workspaceId]/WorkspaceEditPermissionListTable",
  component: WorkspaceEditPermissionListTable,
  args: { workspaceId: "11111111-1111-4111-8111-111111111111" },
} satisfies Meta<typeof WorkspaceEditPermissionListTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
