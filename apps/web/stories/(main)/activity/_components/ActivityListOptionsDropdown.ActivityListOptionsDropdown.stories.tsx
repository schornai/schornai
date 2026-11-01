import { openMenu } from "../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActivityListOptionsDropdown } from "../../../../app/(main)/activity/_components/ActivityListOptionsDropdown";

const meta = {
  title: "Web/(main)/activity/ActivityListOptionsDropdown",
  component: ActivityListOptionsDropdown,
  args: {},
} satisfies Meta<typeof ActivityListOptionsDropdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const MenuOpened: Story = { play: openMenu };
