// @vitest-environment jsdom
import "./client-setup";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ThemeLanguageAdd } from "../../apps/web/app/(settings)/settings/theme/_components/ThemeLanguageAdd";
const state = vi.hoisted(() => ({ options: {} as any }));
vi.mock("next-i18next/client", () => ({
  useT: () => ({
    t: (key: string) => key,
    i18n: { language: "en", languages: ["en", "de"], options: state.options },
  }),
}));
afterEach(cleanup);
beforeEach(() => {
  state.options = {};
});
it.each(["supported", "resources", "languages", "absent"])(
  "adds a missing language using the %s configuration",
  async (source) => {
    state.options =
      source === "supported"
        ? { supportedLngs: ["cimode", "en", "de"] }
        : source === "resources"
          ? { resources: { en: {}, de: {} } }
          : source === "absent"
            ? undefined
            : {};
    const user = userEvent.setup(),
      onAdd = vi.fn();
    render(<ThemeLanguageAdd languages={["en"]} onAdd={onAdd} />);
    await user.click(screen.getByRole("button", { name: "labelAdd" }));
    await user.click(screen.getByRole("button", { name: "labelCreate" }));
    expect(onAdd).toHaveBeenCalledExactlyOnceWith("de");
    expect(screen.queryByRole("dialog")).toBeNull();
  },
);
it.each([true, false])(
  "disables adding when blocked or all languages exist: %s",
  (disabled) => {
    render(
      <ThemeLanguageAdd
        disabled={disabled}
        languages={disabled ? [] : ["en", "de"]}
        onAdd={vi.fn()}
      />,
    );
    expect(
      (screen.getByRole("button", { name: "labelAdd" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  },
);
it("cancels without modifying language configuration", async () => {
  const user = userEvent.setup(),
    onAdd = vi.fn();
  render(<ThemeLanguageAdd languages={[]} onAdd={onAdd} />);
  await user.click(screen.getByRole("button", { name: "labelAdd" }));
  await user.click(screen.getByRole("button", { name: "labelCancel" }));
  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("disables a selection that became unavailable while the dialog was open", async () => {
  const user = userEvent.setup(),
    onAdd = vi.fn();
  const view = render(<ThemeLanguageAdd languages={["en"]} onAdd={onAdd} />);
  await user.click(screen.getByRole("button", { name: "labelAdd" }));
  view.rerender(<ThemeLanguageAdd languages={["en", "de"]} onAdd={onAdd} />);
  expect(
    (screen.getByRole("button", { name: "labelCreate" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(onAdd).not.toHaveBeenCalled();
});
