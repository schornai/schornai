import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActivityStateText } from "../../../../app/(main)/activity/_components/ActivityStateText";

const meta = {
  title: "Web/(main)/activity/ActivityStateText",
  component: ActivityStateText,
  args: { state: "running" },
} satisfies Meta<typeof ActivityStateText>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const State_running: Story = { args: {} };
export const State_success: Story = { args: { state: "success" } };
export const State_error: Story = { args: { state: "error" } };
export const State_idle: Story = { args: { state: "idle" } };
