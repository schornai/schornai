import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ContainerChatMessagePart } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ContainerChatMessagePart";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ContainerChatMessagePart",
  component: ContainerChatMessagePart,
  args: {
    agentColor: { type: "color-oklch-hue", oklchHue: 284 },
    children: "Beispielinhalt",
  },
} satisfies Meta<typeof ContainerChatMessagePart>;
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
export const AgentColor_missing: Story = { args: { agentColor: undefined } };
