import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkspaceEditPermissionList } from "../../../../../../app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditPermissionList";

const meta = {
  title:
    "Web/(settings)/settings/workspace/[workspaceId]/WorkspaceEditPermissionList",
  component: WorkspaceEditPermissionList,
  args: { workspaceId: "11111111-1111-4111-8111-111111111111" },
} satisfies Meta<typeof WorkspaceEditPermissionList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
