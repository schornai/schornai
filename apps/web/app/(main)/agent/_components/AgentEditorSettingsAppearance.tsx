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
import { DialogPickerIcons } from "../../../_components/DialogPickerIcons";
import { DynamicIcon } from "lucide-react/dynamic";
import type { IconName } from "lucide-react/dynamic";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { defaultAgentIcons } from "@/lib/defaultAgentIcons";
import { defaultColors } from "@/lib/defaultColors";
import { useAgentEditor } from "./AgentEditor";
import { useT } from "next-i18next/client";

export function AgentEditorSettingsAppearance() {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorSettingsAppearance",
  });
  const { agent, defaultAgent, setAgent, relations } = useAgentEditor();

  const colors = relations.theme.colors ?? defaultColors;

  const isAdditionalIcon =
    agent?.icon?.iconName &&
    !defaultAgentIcons.some((iconName) => agent.icon?.iconName === iconName);

  return (
    <ContainerMain>
      <FieldSet>
        <FieldLegend>{t("labelLegend")}</FieldLegend>
        <FieldDescription>{t("description")}</FieldDescription>
        <FieldGroup>
          <FieldLabel>
            {t("labelIcon")}{" "}
            <ButtonDiscardChanges
              objA={defaultAgent?.icon}
              objB={agent?.icon}
              onClick={() =>
                setAgent((prev) => ({ ...prev, icon: defaultAgent?.icon }))
              }
              variant="inline"
            />
          </FieldLabel>
          <ul className="flex flex-wrap justify-center gap-5">
            {defaultAgentIcons.map((iconName) => (
              <li key={iconName}>
                <Button
                  onClick={() => {
                    setAgent((prev) => ({
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
                    agent?.icon?.iconName === iconName ? undefined : "outline"
                  }
                >
                  <DynamicIcon name={iconName} />
                </Button>
              </li>
            ))}
            {isAdditionalIcon ? (
              <li>
                <Button size="icon" title={agent?.icon?.iconName}>
                  <DynamicIcon name={agent?.icon?.iconName as IconName} />
                </Button>
              </li>
            ) : undefined}
          </ul>
          <DialogPickerIcons
            onValueChange={(iconName) => {
              setAgent((prev) => ({
                ...prev,
                icon: {
                  iconName,
                  type: "icon-lucide",
                },
              }));
            }}
            value={agent?.icon?.iconName}
          />
        </FieldGroup>
        <FieldGroup>
          <Field>
            <FieldLabel>
              {t("labelColor")}{" "}
              <ButtonDiscardChanges
                objA={defaultAgent?.color}
                objB={agent?.color}
                onClick={() =>
                  setAgent((prev) => ({ ...prev, color: defaultAgent?.color }))
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
                          setAgent((prev) => ({ ...prev, color }));
                        }}
                        variant="outline"
                      />
                    }
                  >
                    {name}
                    {composite(color) === composite(agent?.color) ? (
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
