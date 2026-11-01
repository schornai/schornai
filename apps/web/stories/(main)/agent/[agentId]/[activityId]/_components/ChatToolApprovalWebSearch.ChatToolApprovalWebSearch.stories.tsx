import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatToolApprovalWebSearch } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatToolApprovalWebSearch";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatToolApprovalWebSearch",
  component: ChatToolApprovalWebSearch,
  args: { input: { query: "Research query" } },
} satisfies Meta<typeof ChatToolApprovalWebSearch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const MissingInput: Story = { args: { input: undefined } };
export const InvalidInput: Story = { args: { input: { query: 42 } } };
