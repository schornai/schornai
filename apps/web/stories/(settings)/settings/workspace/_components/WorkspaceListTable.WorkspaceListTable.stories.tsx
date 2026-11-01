import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkspaceListTable } from "../../../../../app/(settings)/settings/workspace/_components/WorkspaceListTable";

const meta = {
  title: "Web/(settings)/settings/workspace/WorkspaceListTable",
  component: WorkspaceListTable,
  args: {},
} satisfies Meta<typeof WorkspaceListTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
