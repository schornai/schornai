import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserEditorAdmin } from "../../../../../../app/(settings)/settings/user/[userId]/_components/UserEditorAdmin";

const meta = {
  title: "Web/(settings)/settings/user/[userId]/UserEditorAdmin",
  component: UserEditorAdmin,
  args: { userId: "11111111-1111-4111-8111-111111111111", isAdmin: false },
} satisfies Meta<typeof UserEditorAdmin>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Admin: Story = { args: { isAdmin: true } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
