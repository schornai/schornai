import { openMenu } from "../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TranscriberListOptionsDropdown } from "../../../../../app/(main)/app/transcribe/_components/TranscriberListOptionsDropdown";

const meta = {
  title: "Web/(main)/app/transcribe/TranscriberListOptionsDropdown",
  component: TranscriberListOptionsDropdown,
  args: {},
} satisfies Meta<typeof TranscriberListOptionsDropdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const MenuOpened: Story = { play: openMenu };
