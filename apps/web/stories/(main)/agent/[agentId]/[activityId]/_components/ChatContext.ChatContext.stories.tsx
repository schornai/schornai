import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatContext } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatContext";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatContext",
  component: ChatContext,
  args: {
    activityId: "11111111-1111-4111-8111-111111111111",
    agentId: "11111111-1111-4111-8111-111111111111",
    children: "Beispielinhalt",
  },
} satisfies Meta<typeof ChatContext>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const ChatIdle: Story = {
  parameters: {
    contextFixtures: { useChatStatus: "idle", useCanSendMessage: true },
  },
};
export const ChatQueued: Story = {
  parameters: {
    contextFixtures: { useChatStatus: "queued", useCanSendMessage: false },
  },
};
export const ChatGenerating: Story = {
  parameters: {
    contextFixtures: { useChatStatus: "generating", useCanSendMessage: false },
  },
};
export const ChatError: Story = {
  parameters: {
    contextFixtures: { useChatStatus: "error", useCanSendMessage: true },
  },
};
