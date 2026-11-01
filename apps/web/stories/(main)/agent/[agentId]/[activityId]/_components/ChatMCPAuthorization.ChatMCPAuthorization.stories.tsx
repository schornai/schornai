import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ChatMCPAuthorization } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMCPAuthorization";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMCPAuthorization",
  component: ChatMCPAuthorization,
  args: {
    agentId: "agent",
    activityId: "activity",
    approvalId: "approval",
    mcpId: "mcp",
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/agent/22222222-2222-4222-8222-222222222222/chat",
        segments: [
          ["agentId", "22222222-2222-4222-8222-222222222222"],
          ["activityId", "chat"],
        ],
      },
    },
  },
} satisfies Meta<typeof ChatMCPAuthorization>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button")).toBeVisible();
    const form = canvasElement.querySelector("form")!;
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("action", "/api/mcp/oauth");
  },
};
export const Disabled: Story = { args: { disabled: true } };
