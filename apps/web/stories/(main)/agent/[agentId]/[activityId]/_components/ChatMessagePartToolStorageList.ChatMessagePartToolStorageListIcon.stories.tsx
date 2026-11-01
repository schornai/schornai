import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePartToolStorageListIcon } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolStorageList";

const meta = {
  title:
    "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartToolStorageListIcon",
  component: ChatMessagePartToolStorageListIcon,
  args: {},
} satisfies Meta<typeof ChatMessagePartToolStorageListIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
