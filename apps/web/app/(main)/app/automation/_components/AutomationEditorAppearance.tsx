"use client";
import { Check } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import type { IconName } from "lucide-react/dynamic";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import {
  Field,
  FieldSet,
  FieldLegend,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@schornio/aibox-package-ui/components/field";
import { useT } from "next-i18next/client";
import type { AutomationInput } from "@schornio/aibox-package-database/automation/_schemas";
import type { Theme } from "../../../../_models/systemConfigTheme";
import { DialogPickerIcons } from "../../../../_components/DialogPickerIcons";
import { defaultColors } from "@/lib/defaultColors";
import { CircleChevronsRight } from "@/lib/icons/circle-chevrons-right";
const icons: IconName[] = [
  "timer",
  "calendar-clock",
  "calendar-days",
  "files",
  "workflow",
  "zap",
];
export function AutomationEditorAppearance({
  value,
  initial,
  onChange,
  theme,
  disabled,
}: {
  value: AutomationInput;
  initial?: AutomationInput;
  onChange: (value: AutomationInput) => void;
  theme?: Theme;
  disabled?: boolean;
}) {
  const { t } = useT("automation");
  const iconName = value.icon?.iconName;
  return (
    <ContainerMain>
      <FieldSet disabled={disabled}>
        <FieldLegend>{t("labelAppearance")}</FieldLegend>
        <FieldDescription>{t("descriptionAppearance")}</FieldDescription>
        <FieldGroup>
          <FieldLabel>
            {t("labelIcon")}{" "}
            <ButtonDiscardChanges
              variant="inline"
              objA={initial?.icon}
              objB={value.icon}
              onClick={() => onChange({ ...value, icon: initial?.icon })}
            />
          </FieldLabel>
          <ul className="flex flex-wrap justify-center gap-5">
            <li>
              <Button
                type="button"
                size="icon"
                title={t("labelDefaultIcon")}
                variant={iconName ? "outline" : undefined}
                onClick={() => onChange({ ...value, icon: undefined })}
              >
                <CircleChevronsRight />
              </Button>
            </li>
            {icons.map((name) => (
              <li key={name}>
                <Button
                  type="button"
                  size="icon"
                  title={name}
                  variant={name === iconName ? undefined : "outline"}
                  onClick={() =>
                    onChange({
                      ...value,
                      icon: { type: "icon-lucide", iconName: name },
                    })
                  }
                >
                  <DynamicIcon name={name} />
                </Button>
              </li>
            ))}
            {iconName && !icons.includes(iconName as IconName) && (
              <li>
                <Button type="button" size="icon" title={iconName}>
                  <DynamicIcon name={iconName as IconName} />
                </Button>
              </li>
            )}
          </ul>
          <DialogPickerIcons
            value={iconName}
            onValueChange={(iconName) =>
              onChange({ ...value, icon: { type: "icon-lucide", iconName } })
            }
          />
        </FieldGroup>
        <FieldGroup>
          <Field>
            <FieldLabel>
              {t("labelColor")}{" "}
              <ButtonDiscardChanges
                variant="inline"
                objA={initial?.color}
                objB={value.color}
                onClick={() => onChange({ ...value, color: initial?.color })}
              />
            </FieldLabel>
            <ul className="flex flex-wrap justify-center gap-2">
              {(theme?.colors ?? defaultColors).map(({ color, name }) => (
                <li key={name}>
                  <ContainerStyled
                    appColor={color}
                    className="relative aspect-video h-auto w-36"
                    interactive
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onChange({ ...value, color })}
                      />
                    }
                  >
                    {name}
                    {JSON.stringify(color) === JSON.stringify(value.color) && (
                      <Check className="absolute right-1 bottom-1 size-8" />
                    )}
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
