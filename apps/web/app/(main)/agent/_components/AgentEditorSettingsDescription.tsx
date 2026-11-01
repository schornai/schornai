"use client";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { useAgentEditor } from "./AgentEditor";
import { useId } from "react";
import { useT } from "next-i18next/client";

export function AgentEditorSettingsDescription() {
  const nameInputId = useId();
  const descriptionInputId = useId();

  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorSettingsDescription",
  });

  const { agent, defaultAgent, setAgent } = useAgentEditor();

  return (
    <ContainerMain>
      <FieldSet>
        <FieldLegend>{t("labelLegend")}</FieldLegend>
        <FieldDescription>{t("description")}</FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={nameInputId}>
              {t("labelName")}{" "}
              <ButtonDiscardChanges
                objA={defaultAgent?.name}
                objB={agent?.name}
                onClick={() =>
                  setAgent((prev) => ({ ...prev, name: defaultAgent?.name }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Input
              id={nameInputId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setAgent((prev) => ({ ...prev, name: value }));
              }}
              value={agent?.name ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={descriptionInputId}>
              {t("labelDescription")}{" "}
              <ButtonDiscardChanges
                objA={defaultAgent?.description}
                objB={agent?.description}
                onClick={() =>
                  setAgent((prev) => ({
                    ...prev,
                    description: defaultAgent?.description,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Textarea
              id={descriptionInputId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setAgent((prev) => ({ ...prev, description: value }));
              }}
              value={agent?.description ?? ""}
            />
          </Field>
        </FieldGroup>
      </FieldSet>
    </ContainerMain>
  );
}
