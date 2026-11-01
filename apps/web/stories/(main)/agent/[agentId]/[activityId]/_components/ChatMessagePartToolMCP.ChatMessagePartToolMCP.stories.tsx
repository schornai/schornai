import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
import { ChatMessagePartToolMCP } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolMCP";
const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartToolMCP",
  component: ChatMessagePartToolMCP,
  args: {
    part: {
      type: "tool-mcp",
      toolCallId: "mcp",
      state: "output-available",
      input: {
        serverId: "service",
        toolName: "list_tasks",
        arguments: { limit: 3 },
      },
      output: { content: [{ type: "text", text: "Example task" }] },
    },
  },
} satisfies Meta<typeof ChatMessagePartToolMCP>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Completed: Story = {};
export const Expanded: Story = { play: openDisclosure };
export const Discovery: Story = {
  args: {
    part: {
      type: "tool-mcp",
      toolCallId: "mcp",
      state: "input-available",
      input: { serverId: "service" },
    },
  },
};
export const Approval: Story = {
  args: {
    part: {
      type: "tool-mcp",
      toolCallId: "mcp",
      state: "approval-requested",
      input: { serverId: "service" },
      approval: { id: "approval" },
    },
  },
};
export const Error: Story = {
  args: {
    part: {
      type: "tool-mcp",
      toolCallId: "mcp",
      state: "output-error",
      input: { serverId: "service", toolName: "list_tasks" },
      errorText: "Request failed",
    },
  },
};
export const Denied: Story = {
  args: {
    part: {
      type: "tool-mcp",
      toolCallId: "mcp",
      state: "output-denied",
      input: { serverId: "service" },
      approval: { id: "approval", approved: false },
    },
  },
};
