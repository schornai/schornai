"use client";

import { useId } from "react";
import { Eye, X } from "lucide-react";
import { useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@schornio/aibox-package-ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import {
  normalizeWelcomeMessage,
  welcomeMessageSettingsSchema,
} from "@/lib/themeSettings";
import { ThemeLanguageAdd } from "./ThemeLanguageAdd";
import { getThemeLanguageName, getThemeLocalized } from "@/lib/themeLanguages";

export function ThemeWelcomeEditor({
  localized,
  onChange,
  disabled = false,
}: {
  localized: Record<string, string>;
  onChange: (localized: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const { t, i18n } = useT("settings", {
    keyPrefix: "_components.ThemeWelcomeEditor",
  });
  const { t: tCommon } = useT("common");
  const normalized = normalizeWelcomeMessage(localized);
  const validation = welcomeMessageSettingsSchema.safeParse({
    localized: normalized,
  });
  const languages = Object.keys(localized);

  return (
    <FieldGroup>
      <FieldSet disabled={disabled}>
        <FieldLegend>{t("labelTitle")}</FieldLegend>
        <FieldDescription>{t("descriptionText")}</FieldDescription>
        <div className="flex flex-col gap-4">
          {languages.map((language) => {
            const languageLabel = getThemeLanguageName(language, i18n.language);
            return (
              <Collapsible key={language}>
                <Card>
                  <CardHeader>
                    <CardTitle>{languageLabel}</CardTitle>
                    {Object.keys(normalized)[0] === language && (
                      <CardDescription>
                        {t("descriptionDefault")}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor={`${id}-${language}`}>
                          {t("labelText", { language: languageLabel })}
                        </FieldLabel>
                        <Textarea
                          id={`${id}-${language}`}
                          rows={10}
                          maxLength={20000}
                          value={localized[language] ?? ""}
                          onChange={(event) => {
                            const updated = {
                              ...localized,
                              [language]: event.target.value,
                            };
                            onChange(updated);
                          }}
                        />
                      </Field>
                      <CollapsibleContent>
                        <MarkdownProse>
                          {getThemeLocalized(normalized, language) ??
                            tCommon("_welcomeMessage", { lng: language })}
                        </MarkdownProse>
                      </CollapsibleContent>
                    </FieldGroup>
                  </CardContent>
                  <CardFooter className="flex-wrap gap-2">
                    <CollapsibleTrigger
                      render={<Button type="button" variant="outline" />}
                    >
                      <Eye data-icon="inline-start" />
                      {t("labelPreview")}
                    </CollapsibleTrigger>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={disabled}
                      aria-label={t("labelRemove", {
                        language: languageLabel,
                      })}
                      onClick={() =>
                        onChange(
                          Object.fromEntries(
                            Object.entries(localized).filter(
                              ([key]) => key !== language,
                            ),
                          ),
                        )
                      }
                    >
                      <X data-icon="inline-start" />
                      {t("labelRemoveButton")}
                    </Button>
                  </CardFooter>
                </Card>
              </Collapsible>
            );
          })}
        </div>
        <Field orientation="horizontal">
          <ThemeLanguageAdd
            languages={languages}
            disabled={disabled}
            onAdd={(language) =>
              onChange({
                ...localized,
                [language]:
                  getThemeLocalized(normalized, language) ??
                  tCommon("_welcomeMessage", { lng: language }),
              })
            }
          />
        </Field>
      </FieldSet>
      {!validation.success && (
        <FieldError role="alert">{t("errorValidation")}</FieldError>
      )}
    </FieldGroup>
  );
}
