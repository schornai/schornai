import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentListCardsContainer } from "../../../../app/(main)/agent/_components/AgentListCardsContainer";

const meta = {
  title: "Web/(main)/agent/AgentListCardsContainer",
  component: AgentListCardsContainer,
  args: { children: "Beispielinhalt" },
} satisfies Meta<typeof AgentListCardsContainer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
