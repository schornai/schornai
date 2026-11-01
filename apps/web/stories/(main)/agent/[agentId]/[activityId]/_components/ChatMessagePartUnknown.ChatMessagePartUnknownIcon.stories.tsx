import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePartUnknownIcon } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartUnknown";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartUnknownIcon",
  component: ChatMessagePartUnknownIcon,
  args: {},
} satisfies Meta<typeof ChatMessagePartUnknownIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
