import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@schornio/aibox-package-ui/components/sidebar";
import { Bot } from "lucide-react";
import { expect, userEvent, waitFor } from "storybook/test";
import { SidebarPanel } from "../../app/_components/SidebarPanel";

const meta = {
  title: "Web/SidebarPanel",
  component: SidebarPanel,
  render: () => (
    <SidebarProvider className="relative min-h-80 [&_[data-slot=sidebar-container]]:absolute [&_[data-slot=sidebar-container]]:h-full">
      <SidebarPanel>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={{ children: "Navigation", side: "inline-end" }}
              >
                <Bot />
                <span>Navigation</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </SidebarPanel>
      <main className="flex-1 p-4">
        <SidebarTrigger />
      </main>
    </SidebarProvider>
  ),
  play: async ({ canvasElement, globals }) => {
    const panel = canvasElement.querySelector(
      '[data-slot="sidebar-container"]',
    )!;
    const content = canvasElement.querySelector("main")!;
    await waitFor(() => {
      expect(panel).toHaveAttribute(
        "data-side",
        globals.locale === "ar" ? "right" : "left",
      );
      const panelRect = panel.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      if (globals.locale === "ar") {
        expect(panelRect.left).toBeGreaterThanOrEqual(contentRect.right - 1);
      } else {
        expect(panelRect.right).toBeLessThanOrEqual(contentRect.left + 1);
      }
    });
  },
} satisfies Meta<typeof SidebarPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Arabic: Story = { globals: { locale: "ar" } };
export const ArabicCollapsed: Story = {
  globals: { locale: "ar" },
  play: async (context) => {
    await meta.play(context);
    const { canvas, canvasElement } = context;
    await userEvent.click(
      canvas.getByRole("button", { name: "Toggle Sidebar" }),
    );
    await waitFor(() => {
      expect(
        canvasElement.querySelector('[data-slot="sidebar"]'),
      ).toHaveAttribute("data-state", "collapsed");
      expect(
        canvasElement
          .querySelector('[data-slot="sidebar-container"]')!
          .getBoundingClientRect().width,
      ).toBeLessThan(60);
    });
    const trigger = canvas.getByRole("button", { name: "Navigation" });
    await userEvent.tab({ shift: true });
    await expect(trigger).toHaveFocus();
    await waitFor(() => {
      const tooltip = canvasElement.ownerDocument.querySelector(
        '[data-slot="tooltip-content"]',
      )!;
      expect(tooltip).toBeVisible();
      expect(tooltip).toHaveTextContent("Navigation");
      expect(tooltip.getBoundingClientRect().right).toBeLessThanOrEqual(
        trigger.getBoundingClientRect().left,
      );
    });
  },
};
