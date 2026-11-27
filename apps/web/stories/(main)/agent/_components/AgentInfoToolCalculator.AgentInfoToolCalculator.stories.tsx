import { openDisclosure } from "../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentInfoToolCalculator } from "../../../../app/(main)/agent/_components/AgentInfoToolCalculator";

const meta = {
  title: "Web/(main)/agent/AgentInfoToolCalculator",
  component: AgentInfoToolCalculator,
} satisfies Meta<typeof AgentInfoToolCalculator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Opened: Story = { play: openDisclosure };
