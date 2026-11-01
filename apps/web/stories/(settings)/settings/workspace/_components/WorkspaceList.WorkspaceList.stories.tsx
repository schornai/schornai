import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkspaceList } from "../../../../../app/(settings)/settings/workspace/_components/WorkspaceList";

const meta = {
  title: "Web/(settings)/settings/workspace/WorkspaceList",
  component: WorkspaceList,
  args: {},
} satisfies Meta<typeof WorkspaceList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
