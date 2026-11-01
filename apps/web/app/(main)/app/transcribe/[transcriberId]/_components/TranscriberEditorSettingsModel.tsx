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
import { useT } from "next-i18next/client";
import { useTranscriberEditor } from "./TranscriberEditor";

export function TranscriberEditorSettingsModel() {
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberEditorSettingsModel",
  });

  const {
    transcriber,
    defaultTranscriber,
    setTranscriber,
    relations,
    validationErrors,
  } = useTranscriberEditor();

  const modelSelectItems = relations.models
    .filter((model) => model.type === "mlx_whisper_v1")
    .map((model) => ({
      label: model.name,
      value: model.identifier,
    }));

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
                objA={defaultTranscriber?.modelIdentifier}
                objB={transcriber?.modelIdentifier}
                onClick={() =>
                  setTranscriber((prev) => ({
                    ...prev,
                    modelIdentifier: defaultTranscriber?.modelIdentifier,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Select
              aria-invalid={Boolean(validationErrors?.modelIdentifier)}
              onValueChange={(value) =>
                setTranscriber((prev) => ({
                  ...prev,
                  modelIdentifier: value ?? undefined,
                }))
              }
              items={modelSelectItems}
              value={transcriber?.modelIdentifier ?? null}
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
        </FieldGroup>
      </FieldSet>
    </ContainerMain>
  );
}
