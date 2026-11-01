import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePartText } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartText";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartText",
  component: ChatMessagePartText,
  args: {
    part: {
      state: "streaming",
      type: "text",
      text: "Eine Beispielnachricht.",
      providerMetadata: {},
    },
  },
} satisfies Meta<typeof ChatMessagePartText>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Part_state_streaming: Story = { args: {} };
export const Part_state_done: Story = {
  args: {
    part: {
      state: "done",
      type: "text",
      text: "Eine Beispielnachricht.",
      providerMetadata: {},
    },
  },
};
