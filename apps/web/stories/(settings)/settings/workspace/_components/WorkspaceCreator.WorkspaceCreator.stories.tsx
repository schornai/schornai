import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkspaceCreator } from "../../../../../app/(settings)/settings/workspace/_components/WorkspaceCreator";

const meta = {
  title: "Web/(settings)/settings/workspace/WorkspaceCreator",
  component: WorkspaceCreator,
} satisfies Meta<typeof WorkspaceCreator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
