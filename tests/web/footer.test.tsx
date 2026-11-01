// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Footer } from "../../apps/web/app/_components/Footer";
const boundary = vi.hoisted(() => ({
  language: "de",
  theme: "light",
  changeLanguage: vi.fn(),
  setTheme: vi.fn(),
}));
vi.mock("next-i18next/client", () => ({
  useT: () => ({
    t: (key: string) => key,
    i18n: { language: boundary.language },
  }),
  useChangeLanguage: () => boundary.changeLanguage,
}));
vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: boundary.theme,
    setTheme: boundary.setTheme,
  }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);
it.each(["de", "en"])(
  "renders %s and changes language and theme preferences",
  async (language) => {
    boundary.language = language;
    boundary.theme = language === "de" ? "dark" : "light";
    render(<Footer />);
    expect(document.querySelector('a[href="/feedback"]')).toBeTruthy();
    const user = userEvent.setup();
    act(() => screen.getAllByRole("combobox")[0].focus());
    await user.keyboard("[ArrowDown]");
    const item = await screen.findByRole("option", {
      name: language === "de" ? "English" : "Deutsch",
    });
    act(() => item.focus());
    await user.keyboard("[Enter]");
    expect(boundary.changeLanguage).toHaveBeenCalledWith(
      language === "de" ? "en" : "de",
    );
    act(() => screen.getAllByRole("combobox")[1].focus());
    await user.keyboard("[ArrowDown]");
    const system = await screen.findByRole("option", {
      name: "footer.labelThemeSystem",
    });
    act(() => system.focus());
    await user.keyboard("[Enter]");
    expect(boundary.setTheme).toHaveBeenCalledWith("system");
  },
);
