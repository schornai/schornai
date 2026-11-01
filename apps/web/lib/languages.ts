// German and English are maintained with every change. Other translations are
// updated only on explicit request; missing strings fall back to German.
export const fallbackLanguage = "de";

export const languages = [
  { code: "de", name: "Deutsch" },
  { code: "en", name: "English" },
  { code: "bg", name: "Български" },
  { code: "cs", name: "Čeština" },
  { code: "da", name: "Dansk" },
  { code: "el", name: "Ελληνικά" },
  { code: "es", name: "Español" },
  { code: "et", name: "Eesti" },
  { code: "fi", name: "Suomi" },
  { code: "fr", name: "Français" },
  { code: "ga", name: "Gaeilge" },
  { code: "hr", name: "Hrvatski" },
  { code: "hu", name: "Magyar" },
  { code: "it", name: "Italiano" },
  { code: "lt", name: "Lietuvių" },
  { code: "lv", name: "Latviešu" },
  { code: "mt", name: "Malti" },
  { code: "nl", name: "Nederlands" },
  { code: "pl", name: "Polski" },
  { code: "pt", name: "Português" },
  { code: "ro", name: "Română" },
  { code: "sk", name: "Slovenčina" },
  { code: "sl", name: "Slovenščina" },
  { code: "sv", name: "Svenska" },
  { code: "uk", name: "Українська" },
  { code: "ar", name: "العربية" },
] as const;

export const supportedLanguages = languages.map(({ code }) => code);

export function getLanguageDirection(language: string): "ltr" | "rtl" {
  return language.split("-")[0] === "ar" ? "rtl" : "ltr";
}
