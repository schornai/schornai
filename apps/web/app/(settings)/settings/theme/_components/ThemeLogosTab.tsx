"use client";

import type { Dispatch, SetStateAction } from "react";
import { useT } from "next-i18next/client";
import {
  Field,
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { TabsContent } from "@schornio/aibox-package-ui/components/tabs";
import type { Theme } from "@/lib/theme";
import { normalizeThemeSettings } from "@/lib/themeSettings";
import { ThemeLogoEditor } from "./ThemeLogoEditor";
import { ThemeLanguageAdd } from "./ThemeLanguageAdd";

export function ThemeLogosTab({
  theme,
  setTheme,
  isBusy,
  setUploadingLanguages,
}: {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  isBusy: boolean;
  setUploadingLanguages: Dispatch<SetStateAction<string[]>>;
}) {
  const { t } = useT("settings", { keyPrefix: "_components.ThemeEditor" });
  const languages = Object.keys(theme.logo ?? {});
  const normalizedTheme = normalizeThemeSettings(theme);
  return (
    <TabsContent value="logos" keepMounted>
      <FieldSet disabled={isBusy}>
        <FieldLegend>{t("labelLogos")}</FieldLegend>
        <FieldDescription>{t("descriptionLogos")}</FieldDescription>
        <div className="flex flex-col gap-4">
          {languages.map((language) => (
            <ThemeLogoEditor
              key={language}
              language={language}
              isDefault={
                Object.keys(normalizedTheme.logo ?? {})[0] === language
              }
              disabled={isBusy}
              onUploadStateChange={(uploading) =>
                setUploadingLanguages((current) =>
                  uploading
                    ? [...new Set([...current, language])]
                    : current.filter((value) => value !== language),
                )
              }
              onRemove={() =>
                setTheme((current) => ({
                  ...current,
                  logo: Object.fromEntries(
                    Object.entries(current.logo ?? {}).filter(
                      ([key]) => key !== language,
                    ),
                  ),
                }))
              }
              logo={theme.logo?.[language]}
              onChange={(logo) =>
                setTheme((current) =>
                  Object.hasOwn(current.logo ?? {}, language)
                    ? {
                        ...current,
                        logo: { ...current.logo, [language]: logo },
                      }
                    : current,
                )
              }
            />
          ))}
        </div>
        <Field orientation="horizontal">
          <ThemeLanguageAdd
            languages={languages}
            disabled={isBusy}
            onAdd={(language) =>
              setTheme((current) => ({
                ...current,
                logo: { ...current.logo, [language]: { url: "" } },
              }))
            }
          />
        </Field>
      </FieldSet>
    </TabsContent>
  );
}
