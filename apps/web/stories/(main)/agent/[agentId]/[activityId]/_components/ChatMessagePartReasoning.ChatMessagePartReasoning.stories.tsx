import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePartReasoning } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartReasoning";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartReasoning",
  component: ChatMessagePartReasoning,
  args: {
    agentColor: { type: "color-oklch-hue", oklchHue: 284 },
    part: {
      type: "reasoning",
      id: "11111111-1111-4111-8111-111111111111",
      text: "Eine Beispielnachricht.",
      state: "streaming",
      providerMetadata: {},
    },
  },
} satisfies Meta<typeof ChatMessagePartReasoning>;
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
export const Part_state_streaming: Story = { args: {} };
export const Part_state_done: Story = {
  args: {
    part: {
      type: "reasoning",
      id: "11111111-1111-4111-8111-111111111111",
      text: "Eine Beispielnachricht.",
      state: "done",
      providerMetadata: {},
    },
  },
};
export const AgentColor_missing: Story = { args: { agentColor: undefined } };
export const Opened: Story = { play: openDisclosure };
