import { openMenu } from "../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentListOptionsDropdown } from "../../../../app/(main)/agent/_components/AgentListOptionsDropdown";

const meta = {
  title: "Web/(main)/agent/AgentListOptionsDropdown",
  component: AgentListOptionsDropdown,
  args: {},
} satisfies Meta<typeof AgentListOptionsDropdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const MenuOpened: Story = { play: openMenu };
