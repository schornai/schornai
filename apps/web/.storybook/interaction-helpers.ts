import { expect, waitFor } from "storybook/test";
import type { StoryContext } from "@storybook/nextjs-vite";

export async function openDisclosure({
  canvasElement,
  userEvent,
}: StoryContext) {
  let trigger: HTMLElement | null = null;
  await waitFor(() => {
    trigger = canvasElement.querySelector<HTMLElement>(
      'button[aria-expanded="false"]:not([aria-haspopup]), [data-slot="collapsible-trigger"]',
    );
    expect(trigger).not.toBeNull();
  });
  if (trigger!.getAttribute("aria-expanded") !== "true")
    await userEvent.click(trigger!);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}
export async function openMenu({ canvasElement, userEvent }: StoryContext) {
  let trigger: HTMLElement | null = null;
  await waitFor(() => {
    trigger = canvasElement.querySelector<HTMLElement>(
      '[aria-haspopup="menu"]',
    );
    expect(trigger).not.toBeNull();
  });
  await userEvent.click(trigger!);
  await waitFor(() =>
    expect(document.querySelector('[role="menu"]')).toBeVisible(),
  );
}
export async function openDeleteDialog(context: StoryContext) {
  await openMenu(context);
  let item: HTMLElement | null = null;
  await waitFor(() => {
    item =
      Array.from(
        document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      ).find((element) => /löschen|delete/i.test(element.textContent ?? "")) ??
      null;
    expect(item).not.toBeNull();
  });
  await context.userEvent.click(item!);
  await waitFor(() =>
    expect(document.querySelector('[role="alertdialog"]')).toBeVisible(),
  );
}
export async function openDialog(context: StoryContext) {
  const { canvasElement, userEvent } = context;
  let trigger: HTMLElement | null = null;
  const directTrigger = canvasElement.querySelector<HTMLElement>(
    '[aria-haspopup="dialog"], [aria-haspopup="alertdialog"], [data-slot="dialog-trigger"], [data-slot="alert-dialog-trigger"]',
  );
  if (!directTrigger && canvasElement.querySelector('[aria-haspopup="menu"]')) {
    await openDeleteDialog(context);
    return;
  }
  await waitFor(() => {
    trigger = canvasElement.querySelector<HTMLElement>(
      '[aria-haspopup="dialog"], [aria-haspopup="alertdialog"], [data-slot="dialog-trigger"], [data-slot="alert-dialog-trigger"]',
    );
    expect(trigger).not.toBeNull();
  });
  await userEvent.click(trigger!);
  await waitFor(() =>
    expect(
      document.querySelector('[role="dialog"], [role="alertdialog"]'),
    ).toBeVisible(),
  );
}
