import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActivityListList } from "../../../../app/(main)/activity/_components/ActivityListList";

const meta = {
  title: "Web/(main)/activity/ActivityListList",
  component: ActivityListList,
  args: {},
} satisfies Meta<typeof ActivityListList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
