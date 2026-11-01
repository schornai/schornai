// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
} from "../packages/ui/src/components/dropdown-menu";
import { DropdownMenuItemAction } from "../packages/ui/src/components/dropdown-menu-item-action";
afterEach(cleanup);
it.each([
  { indicator: "after" },
  { indicator: "replace" },
  { indicator: "replace", isPending: true },
  { indicator: "after", isPending: true },
  { indicator: "replace", hasErrored: true },
  { indicator: "replace", hasSucceeded: true },
  { indicator: "after", hasErrored: true, isPending: true },
  { indicator: "after", hasSucceeded: true, isPending: true },
  { indicator: "after", disabled: true },
  { indicator: "after", variant: "destructive" },
] as const)("shows menu action status %j", (props) => {
  const view = render(
    <DropdownMenu open>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuItemAction {...props}>
            Action text
          </DropdownMenuItemAction>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  const item = screen.getByRole("menuitem");
  const active =
    "isPending" in props || "hasErrored" in props || "hasSucceeded" in props;
  expect(item.textContent?.includes("Action text")).toBe(
    props.indicator !== "replace" || !active,
  );
  expect(!!item.querySelector(".animate-spin")).toBe(
    "isPending" in props && !("hasErrored" in props || "hasSucceeded" in props),
  );
  expect(item.getAttribute("aria-disabled") === "true").toBe(
    "isPending" in props || "disabled" in props,
  );
  expect(view.container).toBeTruthy();
});
