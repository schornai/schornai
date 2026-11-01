import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatToolApprovalStorageTransferFile } from "../../app/(main)/agent/[agentId]/[activityId]/_components/ChatToolApprovalStorageTransferFile";
const meta = {
  title: "Web/Agent/ChatToolApprovalStorageTransferFile",
  component: ChatToolApprovalStorageTransferFile,
  args: {
    input: {
      fromPath: "this_conversation/notes.txt",
      toPath: "docs/notes.txt",
    },
    move: false,
  },
} satisfies Meta<typeof ChatToolApprovalStorageTransferFile>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Move: Story = { args: { move: true } };
export const UnknownInput: Story = { args: { input: {} } };
