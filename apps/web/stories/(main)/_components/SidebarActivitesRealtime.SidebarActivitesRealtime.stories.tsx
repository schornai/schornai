import { openDisclosure } from "../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SidebarActivitesRealtime } from "../../../app/(main)/_components/SidebarActivitesRealtime";

const meta = {
  title: "Web/(main)/SidebarActivitesRealtime",
  component: SidebarActivitesRealtime,
  args: {},
} satisfies Meta<typeof SidebarActivitesRealtime>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const Opened: Story = { play: openDisclosure };
