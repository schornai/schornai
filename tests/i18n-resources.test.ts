import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";
import {
  fallbackLanguage,
  getLanguageDirection,
  supportedLanguages,
} from "../apps/web/lib/languages";

const root = resolve("apps/web/app/i18n/locales");
const namespaces = readdirSync(resolve(root, "en")).filter((file) =>
  file.endsWith(".json"),
);
function read(language: string, namespace: string) {
  const path = resolve(root, language, namespace);
  // New namespaces need not be translated into secondary languages immediately.
  if (language !== "de" && language !== "en" && !existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8"));
}
function flatten(
  value: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof child === "string"
        ? [[path, child]]
        : Object.entries(flatten(child as Record<string, unknown>, path));
    }),
  );
}
function tokens(value: string) {
  return (value.match(/\{\{[^}]+\}\}|<\/?[\w]+\s*\/?\s*>/g) ?? []).sort();
}

it("supports all 24 EU languages, Ukrainian and Arabic", () => {
  expect([...supportedLanguages].sort()).toEqual(
    "ar bg cs da de el en es et fi fr ga hr hu it lt lv mt nl pl pt ro sk sl sv uk".split(
      " ",
    ),
  );
  expect(readdirSync(root).sort()).toEqual([...supportedLanguages].sort());
  expect(getLanguageDirection("ar")).toBe("rtl");
  expect(getLanguageDirection("ar-EG")).toBe("rtl");
  for (const language of supportedLanguages.filter((code) => code !== "ar"))
    expect(getLanguageDirection(language)).toBe("ltr");
});

describe.each(namespaces)("%s", (namespace) => {
  const english = flatten(read("en", namespace));
  const german = flatten(read("de", namespace));

  it("keeps both primary translations complete and their placeholders in sync", () => {
    expect(Object.keys(german).sort()).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(english)) {
      expect(german[key], key).toBeTruthy();
      expect(tokens(german[key]!), key).toEqual(tokens(value));
    }
  });

  it.each(supportedLanguages)(
    "has valid text and native plural forms in %s",
    (language) => {
      const translated = flatten(read(language, namespace));
      for (const [key, value] of Object.entries(translated)) {
        expect(value.trim(), key).not.toBe("");
        // Secondary translations may retain old keys or omit new ones until an
        // explicit translation request, even when primary placeholders change.
        expect(value, key).not.toMatch(/ZXQ\d+ZXQ/);
        expect(value.replace(/\{\{[^{}]+\}\}/g, ""), key).not.toMatch(/[{}]/);
        if (key.endsWith("_other")) {
          for (const form of new Intl.PluralRules(language).resolvedOptions()
            .pluralCategories) {
            expect(
              translated[key.replace(/_other$/, `_${form}`)],
              `${language}:${key}:${form}`,
            ).toBeTruthy();
          }
        }
      }
    },
  );
});

it("falls back to German for future untranslated secondary-language keys", async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: "uk",
    fallbackLng: fallbackLanguage,
    resources: {
      uk: { common: { present: "Готово" } },
      de: { common: { addedLater: "Neuer Text" } },
      en: { common: { addedLater: "New text" } },
    },
    defaultNS: "common",
  });
  expect(i18n.t("present")).toBe("Готово");
  expect(i18n.t("addedLater")).toBe("Neuer Text");
});
