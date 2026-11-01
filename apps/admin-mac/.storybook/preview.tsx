import type { Preview } from "@storybook/react-vite";
import { ThemeProvider } from "next-themes";
import { I18nextProvider } from "react-i18next";
import { createAdminI18n } from "../src/i18n";
import "../src/index.css";

const i18n = createAdminI18n("de");
const preview: Preview = {
  globalTypes: {
    theme: {
      toolbar: {
        icon: "circlehollow",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
    locale: {
      toolbar: { icon: "globe", items: ["de", "en"], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "light", locale: "de" },
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  async beforeEach(context) {
    await i18n.changeLanguage(context.globals.locale);
    document.documentElement.lang = i18n.resolvedLanguage ?? "en";
  },
  decorators: [
    (Story, context) => (
      <I18nextProvider i18n={i18n}>
        <ThemeProvider
          attribute="class"
          forcedTheme={context.globals.theme}
          enableSystem={false}
        >
          <Story />
        </ThemeProvider>
      </I18nextProvider>
    ),
  ],
};
export default preview;
