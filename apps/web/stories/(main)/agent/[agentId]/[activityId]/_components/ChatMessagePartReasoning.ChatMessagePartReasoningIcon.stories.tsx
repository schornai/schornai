import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePartReasoningIcon } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartReasoning";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartReasoningIcon",
  component: ChatMessagePartReasoningIcon,
  args: {},
} satisfies Meta<typeof ChatMessagePartReasoningIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
