// @vitest-environment jsdom
import "./client-setup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { ThemeColorEditor } from "../../apps/web/app/(settings)/settings/theme/_components/ThemeColorEditor";
import type { Theme } from "../../apps/web/lib/theme";

type Entry = NonNullable<Theme["colors"]>[number];
afterEach(cleanup);
function mount(initial: Entry, disabled = false) {
  const changed = vi.fn(),
    removed = vi.fn();
  function Editor() {
    const [entry, setEntry] = useState(initial);
    return (
      <ThemeColorEditor
        entry={entry}
        disabled={disabled}
        index={0}
        defaultOpen
        onChange={(value) => {
          changed(value);
          setEntry(value);
        }}
        onRemove={removed}
      />
    );
  }
  render(<Editor />);
  return { changed, removed };
}
const hue: Entry = {
  id: "brand",
  name: "Brand",
  color: { type: "color-oklch-hue", oklchHue: 30 },
};

it.each(["", "-1", "361"])(
  "marks invalid hue %s without using it in the preview",
  (value) => {
    const { changed } = mount(hue);
    fireEvent.change(screen.getByRole("spinbutton", { name: "labelHue" }), {
      target: { value },
    });
    expect(screen.getByRole("spinbutton").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(
      screen
        .getByRole("slider", { hidden: true })
        .getAttribute("aria-valuenow"),
    ).toBe("0");
    expect(screen.getByRole("img").getAttribute("style") ?? "").not.toMatch(
      /NaN|361|-1/,
    );
    expect(changed).toHaveBeenLastCalledWith({
      ...hue,
      color: { type: "color-oklch-hue", oklchHue: value ? Number(value) : NaN },
    });
  },
);

it("preserves identity and name when switching colour types", async () => {
  const { changed } = mount(hue);
  await userEvent.click(screen.getByRole("combobox"));
  await userEvent.click(
    await screen.findByRole("option", { name: "labelRgbType" }),
  );
  expect(changed).toHaveBeenLastCalledWith({
    ...hue,
    color: { type: "color-rgb", red: 128, green: 128, blue: 128 },
  });
  expect(
    screen.getByRole("slider", { hidden: true }).getAttribute("aria-valuenow"),
  ).toBe("1");
  await userEvent.click(screen.getByRole("combobox"));
  await userEvent.click(
    await screen.findByRole("option", { name: "labelHueType" }),
  );
  expect(changed).toHaveBeenLastCalledWith({
    ...hue,
    color: { type: "color-oklch-hue", oklchHue: 230 },
  });
});

it("edits hue using the keyboard and marks an empty name", () => {
  const { changed, removed } = mount(hue);
  fireEvent.keyDown(screen.getByRole("slider", { hidden: true }), {
    key: "ArrowRight",
  });
  expect(changed).toHaveBeenLastCalledWith({
    ...hue,
    color: { type: "color-oklch-hue", oklchHue: 31 },
  });
  fireEvent.change(screen.getByLabelText("labelName"), {
    target: { value: "" },
  });
  expect(screen.getByLabelText("labelName").getAttribute("aria-invalid")).toBe(
    "true",
  );
  expect(screen.getByText("labelUnnamed")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "labelRemove" }));
  expect(removed).toHaveBeenCalledOnce();
});

it("preserves opacity while editing RGB and updates it using keyboard input", () => {
  const initial: Entry = {
    ...hue,
    color: { type: "color-rgb", red: 10, green: 20, blue: 30, opacity: 0.4 },
  };
  const { changed } = mount(initial);
  fireEvent.change(screen.getByLabelText("labelRgb"), {
    target: { value: "#aabbcc" },
  });
  expect(changed).toHaveBeenLastCalledWith({
    ...hue,
    color: { type: "color-rgb", red: 170, green: 187, blue: 204, opacity: 0.4 },
  });
  fireEvent.keyDown(screen.getByRole("slider", { hidden: true }), {
    key: "ArrowLeft",
  });
  expect(changed.mock.lastCall![0].color.opacity).toBeCloseTo(0.39);
});

it("disables editing and removal while the parent saves", () => {
  const { changed, removed } = mount(hue, true);
  for (const input of screen.getAllByRole("button"))
    expect((input as HTMLButtonElement).disabled).toBe(true);
  expect(
    (screen.getByLabelText("labelName") as HTMLInputElement).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "labelRemove" }));
  expect(changed).not.toHaveBeenCalled();
  expect(removed).not.toHaveBeenCalled();
});
