import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentCardSkeleton } from "../../../../app/(main)/agent/_components/AgentCardSkeleton";

const meta = {
  title: "Web/(main)/agent/AgentCardSkeleton",
  component: AgentCardSkeleton,
  args: {},
} satisfies Meta<typeof AgentCardSkeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
