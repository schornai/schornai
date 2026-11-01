import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SidebarNewChat } from "../../../app/(main)/_components/SidebarNewChat";

const meta = {
  title: "Web/(main)/SidebarNewChat",
  component: SidebarNewChat,
  args: {},
} satisfies Meta<typeof SidebarNewChat>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
