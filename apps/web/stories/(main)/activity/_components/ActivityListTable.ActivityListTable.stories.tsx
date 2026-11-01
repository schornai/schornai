import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActivityListTable } from "../../../../app/(main)/activity/_components/ActivityListTable";

const meta = {
  title: "Web/(main)/activity/ActivityListTable",
  component: ActivityListTable,
  args: {},
} satisfies Meta<typeof ActivityListTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
