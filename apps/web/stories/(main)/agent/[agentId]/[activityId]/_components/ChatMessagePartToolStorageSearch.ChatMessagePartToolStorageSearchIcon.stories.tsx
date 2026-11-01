import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePartToolStorageSearchIcon } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolStorageSearch";

const meta = {
  title:
    "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartToolStorageSearchIcon",
  component: ChatMessagePartToolStorageSearchIcon,
  args: {},
} satisfies Meta<typeof ChatMessagePartToolStorageSearchIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
