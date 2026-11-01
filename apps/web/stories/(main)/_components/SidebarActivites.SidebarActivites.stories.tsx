import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SidebarActivites } from "../../../app/(main)/_components/SidebarActivites";

const meta = {
  tags: ["async-component"],
  title: "Web/(main)/SidebarActivites",
  component: SidebarActivites,
  args: {},
} satisfies Meta<typeof SidebarActivites>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { scenario: "empty" } };
