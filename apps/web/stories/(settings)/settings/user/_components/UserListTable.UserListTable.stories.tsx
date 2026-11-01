import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserListTable } from "../../../../../app/(settings)/settings/user/_components/UserListTable";

const meta = {
  title: "Web/(settings)/settings/user/UserListTable",
  component: UserListTable,
  args: {},
} satisfies Meta<typeof UserListTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
