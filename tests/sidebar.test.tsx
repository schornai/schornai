// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as sidebar from "../packages/ui/src/components/sidebar";
const mobile = vi.hoisted(() => ({ value: false }));
vi.mock("../packages/ui/src/hooks/use-mobile", () => ({
  useIsMobile: () => mobile.value,
}));
afterEach(cleanup);
beforeEach(() => {
  mobile.value = false;
});
describe("sidebar layout and navigation", () => {
  it("toggles through the trigger, rail and keyboard, persisting desktop state", () => {
    const { container } = render(
      <sidebar.SidebarProvider>
        <sidebar.Sidebar collapsible="icon">
          <p>Navigation</p>
          <sidebar.SidebarRail />
        </sidebar.Sidebar>
        <sidebar.SidebarTrigger />
      </sidebar.SidebarProvider>,
    );
    const panel = container.querySelector('[data-slot="sidebar"]')!;
    expect(panel.getAttribute("data-state")).toBe("expanded");
    fireEvent.click(
      screen.getAllByRole("button", { name: "Toggle Sidebar" })[0],
    );
    expect(panel.getAttribute("data-state")).toBe("collapsed");
    expect(document.cookie).toContain("sidebar_state=false");
    fireEvent.keyDown(window, { key: "b" });
    expect(panel.getAttribute("data-state")).toBe("collapsed");
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(panel.getAttribute("data-state")).toBe("expanded");
    fireEvent.keyDown(window, { key: "b", metaKey: true });
    expect(panel.getAttribute("data-state")).toBe("collapsed");
    expect(panel.getAttribute("data-collapsible")).toBe("icon");
  });
  it("supports controlled state and invokes both trigger callbacks and onOpenChange", () => {
    const onOpenChange = vi.fn();
    const onClick = vi.fn();
    render(
      <sidebar.SidebarProvider open={true} onOpenChange={onOpenChange}>
        <sidebar.SidebarTrigger onClick={onClick} />
      </sidebar.SidebarProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onClick).toHaveBeenCalledOnce();
  });
  it.each(["sidebar", "floating", "inset"] as const)(
    "supports %s layouts on either side",
    (variant) => {
      const { container } = render(
        <sidebar.SidebarProvider defaultOpen={false}>
          <sidebar.Sidebar side="right" variant={variant} />
          <sidebar.SidebarInset>Main Content</sidebar.SidebarInset>
        </sidebar.SidebarProvider>,
      );
      expect(
        container
          .querySelector('[data-slot="sidebar"]')
          ?.getAttribute("data-side"),
      ).toBe("right");
      expect(screen.getByRole("main").textContent).toBe("Main Content");
    },
  );
  it("opens mobile navigation as a sheet and keeps desktop state independent", () => {
    mobile.value = true;
    let context: ReturnType<typeof sidebar.useSidebar>;
    const Probe = () => {
      context = sidebar.useSidebar();
      return <sidebar.SidebarTrigger />;
    };
    render(
      <sidebar.SidebarProvider>
        <sidebar.Sidebar>
          <p>Mobile Content</p>
        </sidebar.Sidebar>
        <Probe />
      </sidebar.SidebarProvider>,
    );
    expect(screen.queryByText("Mobile Content")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    expect(screen.getByRole("dialog").textContent).toContain("Mobile Content");
    expect(context!.open).toBe(true);
    expect(context!.openMobile).toBe(true);
    act(() => context!.setOpenMobile(false));
    expect(context!.openMobile).toBe(false);
  });
  it("allows a fixed sidebar and rejects missing providers", () => {
    const { container } = render(
      <sidebar.SidebarProvider>
        <sidebar.Sidebar collapsible="none">Fixed</sidebar.Sidebar>
      </sidebar.SidebarProvider>,
    );
    expect(screen.getByText("Fixed").getAttribute("data-slot")).toBe("sidebar");
    expect(container.querySelector('[data-slot="sidebar-gap"]')).toBeNull();
    expect(() => renderHook(sidebar.useSidebar)).toThrow(
      /within a SidebarProvider/,
    );
  });
  it("composes groups, menus, badges, actions, submenus, labels, inputs and skeletons", () => {
    const onClick = vi.fn();
    const { container } = render(
      <sidebar.SidebarProvider>
        <sidebar.Sidebar>
          <sidebar.SidebarHeader>Header</sidebar.SidebarHeader>
          <sidebar.SidebarInput aria-label="Search" />
          <sidebar.SidebarSeparator />
          <sidebar.SidebarContent>
            <sidebar.SidebarGroup>
              <sidebar.SidebarGroupLabel render={<h2 />}>
                Group
              </sidebar.SidebarGroupLabel>
              <sidebar.SidebarGroupAction onClick={onClick}>
                Add
              </sidebar.SidebarGroupAction>
              <sidebar.SidebarGroupContent>
                <sidebar.SidebarMenu>
                  <sidebar.SidebarMenuItem>
                    <sidebar.SidebarMenuButton
                      isActive
                      variant="outline"
                      size="lg"
                    >
                      Selected
                    </sidebar.SidebarMenuButton>
                    <sidebar.SidebarMenuAction showOnHover>
                      More
                    </sidebar.SidebarMenuAction>
                    <sidebar.SidebarMenuBadge>3</sidebar.SidebarMenuBadge>
                    <sidebar.SidebarMenuSub>
                      <sidebar.SidebarMenuSubItem>
                        <sidebar.SidebarMenuSubButton
                          href="/child"
                          isActive
                          size="sm"
                        >
                          Child
                        </sidebar.SidebarMenuSubButton>
                      </sidebar.SidebarMenuSubItem>
                    </sidebar.SidebarMenuSub>
                  </sidebar.SidebarMenuItem>
                </sidebar.SidebarMenu>
                <sidebar.SidebarMenuSkeleton showIcon />
                <sidebar.SidebarMenuSkeleton />
              </sidebar.SidebarGroupContent>
            </sidebar.SidebarGroup>
          </sidebar.SidebarContent>
          <sidebar.SidebarFooter>Footer</sidebar.SidebarFooter>
        </sidebar.Sidebar>
      </sidebar.SidebarProvider>,
    );
    expect(screen.getByRole("heading", { name: "Group" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Child" }).getAttribute("href"),
    ).toBe("/child");
    expect(
      screen
        .getByRole("button", { name: "Selected" })
        .hasAttribute("data-active"),
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(
      container.querySelectorAll('[data-sidebar="menu-skeleton-icon"]'),
    ).toHaveLength(1);
    expect(screen.getByLabelText("Search")).toBeTruthy();
  });
  it.each(["Help", { children: "Help" }])(
    "supports string and object menu tooltips",
    (tooltip) => {
      render(
        <sidebar.SidebarProvider defaultOpen={false}>
          <sidebar.SidebarMenuButton tooltip={tooltip}>
            Menu
          </sidebar.SidebarMenuButton>
        </sidebar.SidebarProvider>,
      );
      expect(screen.getByRole("button", { name: "Menu" })).toBeTruthy();
    },
  );
});
