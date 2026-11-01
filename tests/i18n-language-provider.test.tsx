// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useDirection } from "@schornio/aibox-package-ui/components/direction";
import { LanguageProvider } from "../apps/web/app/_components/LanguageProvider";

const state = vi.hoisted(() => ({ language: "ar" }));
vi.mock("next-i18next/client", () => ({ useT: () => ({ i18n: state }) }));
afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

function DirectionProbe() {
  return <output>{useDirection()}</output>;
}

it("updates document language and UI keyboard direction when switching to and from Arabic", () => {
  state.language = "ar";
  const view = render(
    <LanguageProvider>
      <DirectionProbe />
    </LanguageProvider>,
  );
  expect(document.documentElement.lang).toBe("ar");
  expect(document.documentElement.dir).toBe("rtl");
  expect(view.getByRole("status").textContent).toBe("rtl");

  state.language = "uk";
  view.rerender(
    <LanguageProvider>
      <DirectionProbe />
    </LanguageProvider>,
  );
  expect(document.documentElement.lang).toBe("uk");
  expect(document.documentElement.dir).toBe("ltr");
  expect(view.getByRole("status").textContent).toBe("ltr");
});
