import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { cookies } from "@storybook/nextjs-vite/headers.mock";
import { expect } from "storybook/test";
import { useSidebar } from "@schornio/aibox-package-ui/components/sidebar";
import { SidebarProviderPersistent } from "../../app/_components/SidebarProviderPersistent";

function SidebarState() {
  const { state } = useSidebar();
  return <output aria-label="Sidebar state">{state}</output>;
}

const meta = {
  title: "Web/SidebarProviderPersistent",
  component: SidebarProviderPersistent,
  tags: ["async-component"],
  args: { children: <SidebarState /> },
  beforeEach: () => {
    cookies().delete("sidebar_state");
  },
} satisfies Meta<typeof SidebarProviderPersistent>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "expanded",
    );
  },
};

export const Collapsed: Story = {
  beforeEach: () => {
    cookies().set("sidebar_state", "false");
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "collapsed",
    );
  },
};
