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
import { defaultTranscriberIcons } from "@/lib/defaultTranscriberIcons";
import { useT } from "next-i18next/client";
import { useTranscriberEditor } from "./TranscriberEditor";

export function TranscriberEditorSettingsAppearance() {
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberEditorSettingsAppearance",
  });
  const { transcriber, defaultTranscriber, setTranscriber, relations } =
    useTranscriberEditor();

  const colors = relations.theme.colors ?? defaultColors;

  const isAdditionalIcon =
    transcriber?.icon?.iconName &&
    !defaultTranscriberIcons.some(
      (iconName) => transcriber.icon?.iconName === iconName,
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
              objA={defaultTranscriber?.icon}
              objB={transcriber?.icon}
              onClick={() =>
                setTranscriber((prev) => ({
                  ...prev,
                  icon: defaultTranscriber?.icon,
                }))
              }
              variant="inline"
            />
          </FieldLabel>
          <ul className="flex flex-wrap justify-center gap-5">
            {defaultTranscriberIcons.map((iconName) => (
              <li key={iconName}>
                <Button
                  onClick={() => {
                    setTranscriber((prev) => ({
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
                    transcriber?.icon?.iconName === iconName
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
                <Button size="icon" title={transcriber?.icon?.iconName}>
                  <DynamicIcon name={transcriber?.icon?.iconName as IconName} />
                </Button>
              </li>
            ) : undefined}
          </ul>
          <DialogPickerIcons
            onValueChange={(iconName) => {
              setTranscriber((prev) => ({
                ...prev,
                icon: {
                  iconName,
                  type: "icon-lucide",
                },
              }));
            }}
            value={transcriber?.icon?.iconName}
          />
        </FieldGroup>
        <FieldGroup>
          <Field>
            <FieldLabel>
              {t("labelColor")}{" "}
              <ButtonDiscardChanges
                objA={defaultTranscriber?.color}
                objB={transcriber?.color}
                onClick={() =>
                  setTranscriber((prev) => ({
                    ...prev,
                    color: defaultTranscriber?.color,
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
                          setTranscriber((prev) => ({ ...prev, color }));
                        }}
                        variant="outline"
                      />
                    }
                  >
                    {name}
                    {composite(color) === composite(transcriber?.color) ? (
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
