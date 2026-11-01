import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessageItems } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessageItems";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessageItems",
  component: ChatMessageItems,
  args: {
    activityId: "11111111-1111-4111-8111-111111111111",
    agentColor: { type: "color-oklch-hue", oklchHue: 284 },
  },
} satisfies Meta<typeof ChatMessageItems>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AgentColor_color_oklch_hue_color_oklch_hue: Story = { args: {} };
export const AgentColor_color_rgb_color_rgb: Story = {
  args: {
    agentColor: {
      type: "color-rgb",
      blue: 200,
      green: 80,
      red: 100,
      opacity: 0.6,
    },
  },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
