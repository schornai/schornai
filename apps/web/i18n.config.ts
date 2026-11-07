import type { I18nConfig } from "next-i18next/proxy";
import intervalPlural from "i18next-intervalplural-postprocessor";
import { fallbackLanguage, supportedLanguages } from "./lib/languages";

const resourceLoader: I18nConfig["resourceLoader"] =
  process.env.NODE_ENV === "development"
    ? async (lng, ns) => {
        // Development translations must be reread when locale files change.
        const fs = await import("fs/promises");
        const path = await import("path");
        const content = await fs.readFile(
          path.resolve(process.cwd(), `app/i18n/locales/${lng}/${ns}.json`),
          "utf-8",
        );
        return JSON.parse(content) as unknown;
      }
    : (lng, ns) => import(`./app/i18n/locales/${lng}/${ns}.json`);

const i18nConfig: I18nConfig = {
  defaultNS: "common",
  fallbackLng: fallbackLanguage,
  localeInPath: false,
  ns: [
    "common",
    "fileNames",
    "feedback",
    "me",
    "signIn",
    "agent",
    "activity",
    "documentRepository",
    "transcriber",
    "settings",
    "workspace",
  ],
  reloadOnPrerender: process.env.NODE_ENV === "development",
  i18nextOptions: { preload: [] },
  resourceLoader,
  supportedLngs: supportedLanguages,
  use: [intervalPlural],
};

export default i18nConfig;
