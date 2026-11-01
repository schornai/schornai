import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserEditPermissionList } from "../../../../../../app/(settings)/settings/user/[userId]/_components/UserEditPermissionList";

const meta = {
  title: "Web/(settings)/settings/user/[userId]/UserEditPermissionList",
  component: UserEditPermissionList,
  args: { userId: "11111111-1111-4111-8111-111111111111" },
} satisfies Meta<typeof UserEditPermissionList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
