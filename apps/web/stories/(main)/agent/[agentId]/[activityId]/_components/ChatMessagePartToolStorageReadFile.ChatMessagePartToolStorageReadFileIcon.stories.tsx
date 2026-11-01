import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePartToolStorageReadFileIcon } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolStorageReadFile";

const meta = {
  title:
    "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartToolStorageReadFileIcon",
  component: ChatMessagePartToolStorageReadFileIcon,
  args: {},
} satisfies Meta<typeof ChatMessagePartToolStorageReadFileIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
