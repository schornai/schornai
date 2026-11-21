import type { Automation } from "@schornio/aibox-package-database/automation/_types";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarProvider,
} from "@schornio/aibox-package-ui/components/sidebar";
import {
  SidebarFavoriteItemAutomation,
  SidebarFavoriteItemAgent,
} from "../../../app/(main)/_components/SidebarFavoriteItem";
import { savedAutomation, agents } from "../app/automation/fixtures";
const meta = {
  title: "Web/(main)/SidebarFavoriteItemAutomation",
  component: SidebarFavoriteItemAutomation,
  args: { automation: savedAutomation },
} satisfies Meta<typeof SidebarFavoriteItemAutomation>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Missing: Story = { args: { automation: undefined } };

export const Expanded: Story = {
  args: {
    automation: { ...savedAutomation, icon: undefined, color: undefined },
  },
  render: (args) => <FavoriteSidebar {...args} open />,
  play: async ({ canvasElement }) => {
    const item = canvasElement.querySelector('a[href$="/info"]')!;
    await expect(
      item.querySelector("button svg.lucide-circle-chevrons-right"),
    ).toBeVisible();
  },
};
export const Collapsed: Story = {
  args: Expanded.args,
  render: (args) => <FavoriteSidebar {...args} open={false} />,
  play: async ({ canvasElement }) => {
    const item = canvasElement.querySelector('a[href$="/info"]')!;
    const avatar = item.querySelector('[data-slot="avatar"]')!;
    const fallback = avatar.querySelector('[data-slot="avatar-fallback"]')!;
    await expect(getComputedStyle(fallback).borderTopWidth).toBe("0px");
    await expect(getComputedStyle(avatar, "::after").borderTopWidth).toBe(
      "0px",
    );
    await waitFor(() => expect(fallback.querySelector("svg")).not.toBeNull());
    const symbol = fallback.querySelector("svg")!.getBoundingClientRect();
    const bounds = item.getBoundingClientRect();
    await expect(symbol.left).toBeGreaterThanOrEqual(bounds.left);
    await expect(symbol.right).toBeLessThanOrEqual(bounds.right);
  },
};
export const CollapsedCustom: Story = {
  ...Collapsed,
  args: { automation: savedAutomation },
};

function FavoriteSidebar({
  automation,
  open,
}: {
  automation?: Automation;
  open: boolean;
}) {
  return (
    <SidebarProvider open={open}>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarMenu>
            <SidebarFavoriteItemAutomation automation={automation} />
            <SidebarFavoriteItemAgent
              agent={{
                ...agents[0]!,
                name: "Buchhaltung – Belege einordnen",
                color: { type: "color-oklch-hue", oklchHue: 150 },
                icon: { type: "icon-lucide", iconName: "folder-check" },
              }}
            />
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
