import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePartToolStorageWriteFileIcon } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolStorageWriteFile";

const meta = {
  title:
    "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartToolStorageWriteFileIcon",
  component: ChatMessagePartToolStorageWriteFileIcon,
  args: {},
} satisfies Meta<typeof ChatMessagePartToolStorageWriteFileIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
