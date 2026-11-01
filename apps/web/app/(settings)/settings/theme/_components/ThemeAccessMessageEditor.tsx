"use client";

import { useId } from "react";
import { Eye, X } from "lucide-react";
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
import { useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldDescription,
  FieldError,
} from "@schornio/aibox-package-ui/components/field";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import {
  accessMessageSchema,
  accessMessagePlaceholders,
  getAccessMessageTemplate,
  renderAccessMessage,
  type AccessMessageTemplates,
} from "@/lib/accessMessage";
import { getThemeLanguageName } from "@/lib/themeLanguages";
import { ThemeLanguageAdd } from "./ThemeLanguageAdd";

export function ThemeAccessMessageEditor({
  localized,
  onChange,
  disabled = false,
}: {
  localized: AccessMessageTemplates;
  onChange: (localized: AccessMessageTemplates) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const { t, i18n } = useT("settings", {
    keyPrefix: "_components.ThemeAccessMessageEditor",
  });
  const validation = accessMessageSchema.safeParse({ localized });
  return (
    <FieldGroup>
      <FieldSet disabled={disabled}>
        <FieldLegend>{t("labelTitle")}</FieldLegend>
        <FieldDescription>{t("descriptionText")}</FieldDescription>
        <FieldDescription>
          {t("descriptionPlaceholders")}{" "}
          {accessMessagePlaceholders.map((key) => `{{${key}}}`).join(", ")}
        </FieldDescription>
        <div className="flex flex-col gap-4">
          {Object.entries(localized).map(([language, template], index) => {
            const languageLabel = getThemeLanguageName(language, i18n.language);
            const previewValues = {
              firstName: "Ada",
              lastName: "Lovelace",
              fullName: "Ada Lovelace",
              email: "ada@example.test",
              resetUrl: "https://example.test/signin/reset",
              resetKey: t("labelExampleKey"),
              expires: t("labelExampleExpiry"),
            };
            return (
              <Collapsible key={language}>
                <Card>
                  <CardHeader>
                    <CardTitle>{languageLabel}</CardTitle>
                    {index === 0 && (
                      <CardDescription>
                        {t("descriptionDefault")}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor={`${id}-${language}-subject`}>
                          {t("labelSubject")}
                        </FieldLabel>
                        <Input
                          id={`${id}-${language}-subject`}
                          maxLength={300}
                          value={template.subject}
                          onChange={(event) =>
                            onChange({
                              ...localized,
                              [language]: {
                                ...template,
                                subject: event.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`${id}-${language}-body`}>
                          {t("labelBody")}
                        </FieldLabel>
                        <Textarea
                          id={`${id}-${language}-body`}
                          rows={10}
                          maxLength={10000}
                          value={template.body}
                          onChange={(event) =>
                            onChange({
                              ...localized,
                              [language]: {
                                ...template,
                                body: event.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                      <CollapsibleContent>
                        <FieldGroup>
                          <FieldDescription>
                            {t("descriptionPreview")}
                          </FieldDescription>
                          <Field>
                            <FieldLabel>{t("labelSubject")}</FieldLabel>
                            <p className="break-words whitespace-pre-wrap">
                              {renderAccessMessage(
                                template.subject,
                                previewValues,
                              )}
                            </p>
                          </Field>
                          <Field>
                            <FieldLabel>{t("labelBody")}</FieldLabel>
                            <p className="break-words whitespace-pre-wrap">
                              {renderAccessMessage(
                                template.body,
                                previewValues,
                              )}
                            </p>
                          </Field>
                        </FieldGroup>
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
            languages={Object.keys(localized)}
            disabled={disabled}
            onAdd={(language) =>
              onChange({
                ...localized,
                [language]: getAccessMessageTemplate({}, language),
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
