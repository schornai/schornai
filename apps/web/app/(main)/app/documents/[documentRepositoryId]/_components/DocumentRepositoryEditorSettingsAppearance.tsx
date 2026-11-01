"use client";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { Check } from "lucide-react";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { DialogPickerIcons } from "../../../../../_components/DialogPickerIcons";
import { DynamicIcon } from "lucide-react/dynamic";
import type { IconName } from "lucide-react/dynamic";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { defaultColors } from "@/lib/defaultColors";
import { defaultDocumentRepositoryIcons } from "@/lib/defaultDocumentRepositoryIcons";
import { useDocumentRepositoryEditor } from "./DocumentRepositoryEditor";
import { useT } from "next-i18next/client";

export function DocumentRepositoryEditorSettingsAppearance() {
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryEditorSettingsAppearance",
  });
  const {
    defaultDocumentRepository,
    documentRepository,
    relations,
    setDocumentRepository,
  } = useDocumentRepositoryEditor();

  const colors = relations.theme.colors ?? defaultColors;

  const isAdditionalIcon =
    documentRepository?.icon?.iconName &&
    !defaultDocumentRepositoryIcons.some(
      (iconName) => documentRepository.icon?.iconName === iconName,
    );

  return (
    <ContainerMain>
      <FieldSet>
        <FieldLegend>{t("labelLegend")}</FieldLegend>
        <FieldDescription>{t("description")}</FieldDescription>
        <FieldGroup>
          <FieldLabel>
            {t("labelIcon")}{" "}
            <ButtonDiscardChanges
              objA={defaultDocumentRepository?.icon}
              objB={documentRepository?.icon}
              onClick={() =>
                setDocumentRepository((prev) => ({
                  ...prev,
                  icon: defaultDocumentRepository?.icon,
                }))
              }
              variant="inline"
            />
          </FieldLabel>
          <ul className="flex flex-wrap justify-center gap-5">
            {defaultDocumentRepositoryIcons.map((iconName) => (
              <li key={iconName}>
                <Button
                  onClick={() => {
                    setDocumentRepository((prev) => ({
                      ...prev,
                      icon: {
                        iconName,
                        type: "icon-lucide",
                      },
                    }));
                  }}
                  size="icon"
                  title={iconName}
                  variant={
                    documentRepository?.icon?.iconName === iconName
                      ? undefined
                      : "outline"
                  }
                >
                  <DynamicIcon name={iconName} />
                </Button>
              </li>
            ))}
            {isAdditionalIcon ? (
              <li>
                <Button size="icon" title={documentRepository?.icon?.iconName}>
                  <DynamicIcon
                    name={documentRepository?.icon?.iconName as IconName}
                  />
                </Button>
              </li>
            ) : undefined}
          </ul>
          <DialogPickerIcons
            onValueChange={(iconName) => {
              setDocumentRepository((prev) => ({
                ...prev,
                icon: {
                  iconName,
                  type: "icon-lucide",
                },
              }));
            }}
            value={documentRepository?.icon?.iconName}
          />
        </FieldGroup>
        <FieldGroup>
          <Field>
            <FieldLabel>
              {t("labelColor")}{" "}
              <ButtonDiscardChanges
                objA={defaultDocumentRepository?.color}
                objB={documentRepository?.color}
                onClick={() =>
                  setDocumentRepository((prev) => ({
                    ...prev,
                    color: defaultDocumentRepository?.color,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <ul className="flex flex-wrap justify-center gap-2">
              {colors.map(({ color, name }) => (
                <li key={name}>
                  <ContainerStyled
                    appColor={color}
                    className={cn("relative aspect-video h-auto w-36")}
                    interactive
                    render={
                      <Button
                        onClick={() => {
                          setDocumentRepository((prev) => ({ ...prev, color }));
                        }}
                        variant="outline"
                      />
                    }
                  >
                    {name}
                    {composite(color) ===
                    composite(documentRepository?.color) ? (
                      <Check className="absolute right-1 bottom-1 size-8" />
                    ) : undefined}
                  </ContainerStyled>
                </li>
              ))}
            </ul>
          </Field>
        </FieldGroup>
      </FieldSet>
    </ContainerMain>
  );
}
