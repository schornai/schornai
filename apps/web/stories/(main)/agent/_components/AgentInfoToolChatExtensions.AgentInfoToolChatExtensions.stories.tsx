import { openDisclosure } from "../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentInfoToolChatExtensions } from "../../../../app/(main)/agent/_components/AgentInfoToolChatExtensions";

const meta = {
  title: "Web/(main)/agent/AgentInfoToolChatExtensions",
  component: AgentInfoToolChatExtensions,
  args: {},
} satisfies Meta<typeof AgentInfoToolChatExtensions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Opened: Story = { play: openDisclosure };
