import { openMenu } from "../../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserEditPermissionListOptionsDropdown } from "../../../../../../app/(settings)/settings/user/[userId]/_components/UserEditPermissionListOptionsDropdown";

const meta = {
  title:
    "Web/(settings)/settings/user/[userId]/UserEditPermissionListOptionsDropdown",
  component: UserEditPermissionListOptionsDropdown,
  args: {},
} satisfies Meta<typeof UserEditPermissionListOptionsDropdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const MenuOpened: Story = { play: openMenu };
