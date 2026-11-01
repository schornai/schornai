import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { I18nextProvider } from "react-i18next";
import { App } from "./renderer/App";
import { createAdminI18n } from "./i18n";
import "./index.css";

const i18n = createAdminI18n(navigator.language);
document.documentElement.lang = i18n.resolvedLanguage ?? "en";
const root = createRoot(document.getElementById("root")!);
root.render(
  createElement(
    I18nextProvider,
    { i18n },
    createElement(
      ThemeProvider,
      { attribute: "class", defaultTheme: "system" },
      createElement(App),
    ),
  ),
);
