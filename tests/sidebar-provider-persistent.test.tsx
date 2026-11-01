// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { Sidebar, SidebarTrigger } from "../packages/ui/src/components/sidebar";
import { SidebarProviderPersistent } from "../apps/web/app/_components/SidebarProviderPersistent";

const { getCookie } = vi.hoisted(() => ({ getCookie: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: getCookie }) }));
vi.mock("../packages/ui/src/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));
afterEach(cleanup);

it.each([
  ["false", "collapsed"],
  ["true", "expanded"],
  [undefined, "expanded"],
  ["invalid", "expanded"],
])(
  "renders cookie %s in the correct state before hydration",
  async (value, state) => {
    getCookie.mockReturnValue(value === undefined ? undefined : { value });
    const provider = await SidebarProviderPersistent({
      children: <Sidebar collapsible="icon" />,
    });
    expect(renderToString(provider)).toContain(`data-state="${state}"`);
    expect(getCookie).toHaveBeenCalledWith("sidebar_state");
  },
);

it("writes the toggled state to the cookie and restores it on the next server render", async () => {
  getCookie.mockReturnValue({ value: "true" });
  const { unmount } = render(
    await SidebarProviderPersistent({ children: <SidebarTrigger /> }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
  expect(document.cookie).toContain("sidebar_state=false");
  unmount();
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("sidebar_state="))
    ?.split("=")[1];
  getCookie.mockReturnValue({ value });
  const provider = await SidebarProviderPersistent({
    children: <Sidebar collapsible="icon" />,
  });
  expect(renderToString(provider)).toContain('data-state="collapsed"');
});
