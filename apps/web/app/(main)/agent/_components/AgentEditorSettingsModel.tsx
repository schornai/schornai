"use client";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { useAgentEditor } from "./AgentEditor";
import { useT } from "next-i18next/client";

export function AgentEditorSettingsModel() {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorSettingsModel",
  });

  const { agent, defaultAgent, setAgent, relations, validationErrors } =
    useAgentEditor();

  const modelSelectItems = relations.models
    .filter(
      (model) =>
        model.type === "ollama_llm_v1" || model.type === "external_llm_v1",
    )
    .map((model) => ({
      label: model.name,
      value: model.identifier,
    }));

  const modelThinkingSelectItems = [
    {
      label: t("labelThinking_optionalOn"),
      value: "optional-on",
    },
    {
      label: t("labelThinking_mandatoryOn"),
      value: "mandatory-on",
    },
    {
      label: t("labelThinking_optionalOff"),
      value: "optional-off",
    },
    {
      label: t("labelThinking_mandatoryOff"),
      value: "mandatory-off",
    },
  ];

  return (
    <ContainerMain id="model" className="scroll-mt-32">
      <FieldSet>
        <FieldLegend>{t("labelTitle")}</FieldLegend>
        <FieldDescription>{t("description")}</FieldDescription>
        <FieldGroup>
          <Field data-invalid={Boolean(validationErrors?.modelIdentifier)}>
            <FieldLabel>
              {t("labelName")}{" "}
              <ButtonDiscardChanges
                objA={defaultAgent?.modelIdentifier}
                objB={agent?.modelIdentifier}
                onClick={() =>
                  setAgent((prev) => ({
                    ...prev,
                    modelIdentifier: defaultAgent?.modelIdentifier,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Select
              aria-invalid={Boolean(validationErrors?.modelIdentifier)}
              onValueChange={(value) =>
                setAgent((prev) => ({
                  ...prev,
                  modelIdentifier: value ?? undefined,
                }))
              }
              items={modelSelectItems}
              value={agent?.modelIdentifier ?? null}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {modelSelectItems.map((modelItem) => (
                    <SelectItem key={modelItem.value} value={modelItem.value}>
                      {modelItem.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {validationErrors?.modelIdentifier ? (
              <FieldError>{t("labelSelectModel")}</FieldError>
            ) : undefined}
          </Field>
          <Field>
            <FieldLabel>
              {t("labelThinking")}{" "}
              <ButtonDiscardChanges
                objA={defaultAgent?.modelThinking}
                objB={agent?.modelThinking}
                onClick={() =>
                  setAgent((prev) => ({
                    ...prev,
                    modelThinking: defaultAgent?.modelThinking,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Select
              onValueChange={(value) =>
                setAgent((prev) => ({
                  ...prev,
                  modelThinking: value ?? undefined,
                }))
              }
              items={modelThinkingSelectItems}
              value={agent?.modelThinking ?? null}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {modelThinkingSelectItems.map((modelThinkenItem) => (
                    <SelectItem
                      key={modelThinkenItem.value}
                      value={modelThinkenItem.value}
                    >
                      {modelThinkenItem.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </FieldSet>
    </ContainerMain>
  );
}
