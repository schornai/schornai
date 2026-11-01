import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ContainerChat } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ContainerChat";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ContainerChat",
  component: ContainerChat,
  args: { children: "Beispielinhalt" },
} satisfies Meta<typeof ContainerChat>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
