import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePartUserText } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartUserText";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartUserText",
  component: ChatMessagePartUserText,
  args: { text: "Eine Beispielnachricht." },
} satisfies Meta<typeof ChatMessagePartUserText>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Text_missing: Story = { args: { text: undefined } };
export const LongText: Story = {
  args: { text: "Eine lange Beispielnachricht. ".repeat(20) },
};
export const Opened: Story = { ...LongText, play: openDisclosure };
