import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CreateUser } from "../../../../../app/(settings)/settings/user/_components/CreateUser";

const meta = {
  title: "Web/(settings)/settings/user/CreateUser",
  component: CreateUser,
} satisfies Meta<typeof CreateUser>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
