// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as menu from "../packages/ui/src/components/context-menu";
import * as combo from "../packages/ui/src/components/combobox";
import * as avatar from "../packages/ui/src/components/avatar";
import {
  ButtonGroup,
  ButtonGroupText,
  ButtonGroupSeparator,
} from "../packages/ui/src/components/button-group";
afterEach(cleanup);

it("exposes context-menu checkbox and radio choices with their selection state", async () => {
  const user = userEvent.setup();
  const checked = vi.fn(),
    selected = vi.fn();
  render(
    <menu.ContextMenu>
      <menu.ContextMenuTrigger>File</menu.ContextMenuTrigger>
      <menu.ContextMenuContent>
        <menu.ContextMenuGroup>
          <menu.ContextMenuLabel inset>Preferences</menu.ContextMenuLabel>
          <menu.ContextMenuCheckboxItem
            checked
            onCheckedChange={checked}
            closeOnClick={false}
          >
            Pinned
          </menu.ContextMenuCheckboxItem>
          <menu.ContextMenuRadioGroup value="name" onValueChange={selected}>
            <menu.ContextMenuRadioItem value="name" closeOnClick={false}>
              Name
            </menu.ContextMenuRadioItem>
            <menu.ContextMenuRadioItem value="date" closeOnClick={false}>
              Date
            </menu.ContextMenuRadioItem>
          </menu.ContextMenuRadioGroup>
          <menu.ContextMenuSeparator />
          <menu.ContextMenuItem disabled>Unavailable</menu.ContextMenuItem>
          <menu.ContextMenuItem variant="destructive">
            Delete<menu.ContextMenuShortcut>⌘⌫</menu.ContextMenuShortcut>
          </menu.ContextMenuItem>
        </menu.ContextMenuGroup>
      </menu.ContextMenuContent>
    </menu.ContextMenu>,
  );
  fireEvent.contextMenu(screen.getByText("File"));
  expect(
    screen
      .getByRole("menuitemcheckbox", { name: "Pinned" })
      .getAttribute("aria-checked"),
  ).toBe("true");
  await user.click(screen.getByRole("menuitemcheckbox", { name: "Pinned" }));
  expect(checked.mock.calls[0][0]).toBe(false);
  expect(
    screen
      .getByRole("menuitemradio", { name: "Name" })
      .getAttribute("aria-checked"),
  ).toBe("true");
  await user.click(screen.getByRole("menuitemradio", { name: "Date" }));
  expect(selected.mock.calls[0][0]).toBe("date");
  expect(
    screen
      .getByRole("menuitem", { name: "Unavailable" })
      .getAttribute("aria-disabled"),
  ).toBe("true");
  expect(screen.getByRole("menuitem", { name: /Delete/ }).dataset.variant).toBe(
    "destructive",
  );
});

it("opens nested context commands through the keyboard", async () => {
  const user = userEvent.setup();
  const run = vi.fn();
  render(
    <menu.ContextMenu>
      <menu.ContextMenuTrigger>Actions</menu.ContextMenuTrigger>
      <menu.ContextMenuContent>
        <menu.ContextMenuGroup>
          <menu.ContextMenuSub>
            <menu.ContextMenuSubTrigger inset>More</menu.ContextMenuSubTrigger>
            <menu.ContextMenuSubContent>
              <menu.ContextMenuGroup>
                <menu.ContextMenuItem onClick={run}>
                  Archive
                </menu.ContextMenuItem>
              </menu.ContextMenuGroup>
            </menu.ContextMenuSubContent>
          </menu.ContextMenuSub>
        </menu.ContextMenuGroup>
      </menu.ContextMenuContent>
    </menu.ContextMenu>,
  );
  fireEvent.contextMenu(screen.getByText("Actions"));
  screen.getByRole("menuitem", { name: "More" }).focus();
  await user.keyboard("{ArrowRight}");
  await user.click(await screen.findByRole("menuitem", { name: "Archive" }));
  expect(run).toHaveBeenCalledOnce();
});

it("filters combobox options, selects a value and clears it", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(
    <combo.Combobox items={["Alpha", "Beta"]} onValueChange={change}>
      <combo.ComboboxInput aria-label="Model" showClear />
      <combo.ComboboxContent>
        <combo.ComboboxEmpty>No models</combo.ComboboxEmpty>
        <combo.ComboboxList>
          {(item: string) => (
            <combo.ComboboxItem key={item} value={item}>
              {item}
            </combo.ComboboxItem>
          )}
        </combo.ComboboxList>
      </combo.ComboboxContent>
    </combo.Combobox>,
  );
  await user.type(screen.getByRole("combobox", { name: "Model" }), "Bet");
  expect(screen.queryByRole("option", { name: "Alpha" })).toBeNull();
  await user.click(screen.getByRole("option", { name: "Beta" }));
  expect(change.mock.calls.at(-1)?.[0]).toBe("Beta");
  const clear = document.querySelector('[data-slot="combobox-clear"]')!;
  await user.click(clear);
  expect(change.mock.calls.at(-1)?.[0]).toBeNull();
  expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("");
  await user.type(screen.getByRole("combobox"), "Missing");
  expect(screen.queryAllByRole("option")).toHaveLength(0);
  expect(screen.getByText("No models")).toBeTruthy();
});

it("renders grouped combobox labels and a separate value trigger", () => {
  render(
    <combo.Combobox defaultOpen defaultValue="Alpha" items={["Alpha"]}>
      <combo.ComboboxTrigger aria-label="Choose">
        <combo.ComboboxValue />
      </combo.ComboboxTrigger>
      <combo.ComboboxContent>
        <combo.ComboboxList>
          <combo.ComboboxGroup>
            <combo.ComboboxLabel>Models</combo.ComboboxLabel>
            <combo.ComboboxCollection>
              {(item: string) => (
                <combo.ComboboxItem key={item} value={item}>
                  {item}
                </combo.ComboboxItem>
              )}
            </combo.ComboboxCollection>
          </combo.ComboboxGroup>
          <combo.ComboboxSeparator />
        </combo.ComboboxList>
      </combo.ComboboxContent>
    </combo.Combobox>,
  );
  expect(
    screen.getByRole("combobox", { name: "Choose" }).textContent,
  ).toContain("Alpha");
  expect(screen.getByRole("group", { name: "Models" })).toBeTruthy();
  expect(
    screen.getByRole("option", { name: "Alpha" }).getAttribute("aria-selected"),
  ).toBe("true");
});

it.each(["horizontal", "vertical"] as const)(
  "composes an accessible %s button group",
  (orientation) => {
    render(
      <ButtonGroup orientation={orientation} aria-label="Page">
        <ButtonGroupText render={<span />}>Page 1</ButtonGroupText>
        <ButtonGroupSeparator />
        <button>Next</button>
      </ButtonGroup>,
    );
    expect(
      screen.getByRole("group", { name: "Page" }).dataset.orientation,
    ).toBe(orientation);
    expect(screen.getByText("Page 1").tagName).toBe("SPAN");
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
  },
);

it("keeps avatar fallback, status and overflow count accessible", () => {
  render(
    <avatar.AvatarGroup aria-label="Members">
      <avatar.Avatar size="sm">
        <avatar.AvatarFallback>TS</avatar.AvatarFallback>
        <avatar.AvatarBadge aria-label="Online" />
      </avatar.Avatar>
      <avatar.AvatarGroupCount aria-label="3 more members">
        +3
      </avatar.AvatarGroupCount>
    </avatar.AvatarGroup>,
  );
  expect(screen.getByText("TS")).toBeTruthy();
  expect(screen.getByLabelText("Online")).toBeTruthy();
  expect(screen.getByLabelText("3 more members").textContent).toBe("+3");
});
