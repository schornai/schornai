import { openMenu } from "../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SidebarFooter } from "../../app/_components/SidebarFooter";

const meta = {
  tags: ["async-component"],
  title: "Web/SidebarFooter",
  component: SidebarFooter,
  args: {},
} satisfies Meta<typeof SidebarFooter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const MenuOpened: Story = { play: openMenu };

export const Empty: Story = { parameters: { scenario: "empty" } };

export const AdminMenuOpened: Story = {
  play: openMenu,
  parameters: { serviceFixtures: { getWorkspaceClaims: { isAdmin: true } } },
};
