import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import de from "./locales/de/admin.json";
import en from "./locales/en/admin.json";

// Electron has no Next.js router. Use the same i18next engine with bundled,
// offline resources rather than next-i18next's App Router adapter.
export function createAdminI18n(language: string) {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: "en",
    supportedLngs: ["de", "en"],
    load: "languageOnly",
    ns: ["admin"],
    defaultNS: "admin",
    resources: { de: { admin: de }, en: { admin: en } },
    initAsync: false,
    interpolation: { escapeValue: false },
  });
  return instance;
}
