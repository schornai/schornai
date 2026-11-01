import { openMenu } from "../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserListOptionsDropdown } from "../../../../../app/(settings)/settings/user/_components/UserListOptionsDropdown";

const meta = {
  title: "Web/(settings)/settings/user/UserListOptionsDropdown",
  component: UserListOptionsDropdown,
  args: {},
} satisfies Meta<typeof UserListOptionsDropdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const MenuOpened: Story = { play: openMenu };
