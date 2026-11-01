import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserList } from "../../../../../app/(settings)/settings/user/_components/UserList";

const meta = {
  title: "Web/(settings)/settings/user/UserList",
  component: UserList,
  args: {},
} satisfies Meta<typeof UserList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
