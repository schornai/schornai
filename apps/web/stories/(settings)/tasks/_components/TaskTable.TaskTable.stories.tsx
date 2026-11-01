import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TaskTable } from "../../../../app/(settings)/tasks/_components/TaskTable";

const meta = {
  title: "Web/(settings)/tasks/TaskTable",
  component: TaskTable,
  args: {},
} satisfies Meta<typeof TaskTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
