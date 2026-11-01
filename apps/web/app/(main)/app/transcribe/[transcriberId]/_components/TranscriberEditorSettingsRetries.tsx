"use client";

import { useId } from "react";
import { useT } from "next-i18next/client";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { Slider } from "@schornio/aibox-package-ui/components/slider";
import type { TranscriptionRetryLevel } from "@schornio/aibox-package-database/transcriber/_types";
import { useTranscriberEditor } from "./TranscriberEditor";

const levels: TranscriptionRetryLevel[] = ["fast", "balanced", "thorough"];

export function TranscriberEditorSettingsRetries() {
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberEditorSettingsRetries",
  });
  const id = useId();
  const {
    transcriber,
    defaultTranscriber,
    setTranscriber,
    validationErrors,
    isPending,
  } = useTranscriberEditor();
  const level = transcriber?.retryLevel ?? "thorough";
  const labels = {
    fast: t("labelFast"),
    balanced: t("labelBalanced"),
    thorough: t("labelThorough"),
  };
  const descriptions = {
    fast: t("descriptionFast"),
    balanced: t("descriptionBalanced"),
    thorough: t("descriptionThorough"),
  };
  const invalid = Boolean(validationErrors?.retryLevel);

  return (
    <ContainerMain id="retries" className="scroll-mt-32">
      <FieldSet>
        <FieldLegend>{t("labelTitle")}</FieldLegend>
        <FieldDescription>{t("description")}</FieldDescription>
        <FieldGroup>
          <Field data-invalid={invalid} data-disabled={isPending}>
            <FieldLabel id={`${id}-label`}>
              {t("labelLevel")}
              <ButtonDiscardChanges
                objA={defaultTranscriber?.retryLevel ?? "thorough"}
                objB={level}
                disabled={isPending}
                onClick={() =>
                  setTranscriber((previous) => ({
                    ...previous,
                    retryLevel: defaultTranscriber?.retryLevel,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Slider
              className="max-w-sm"
              aria-labelledby={`${id}-label ${id}-selected`}
              aria-invalid={invalid}
              disabled={isPending}
              min={0}
              max={2}
              step={1}
              largeStep={1}
              value={[levels.indexOf(level)]}
              onValueChange={(value) => {
                const retryLevel =
                  levels[Array.isArray(value) ? value[0]! : value];
                if (retryLevel)
                  setTranscriber((previous) => ({ ...previous, retryLevel }));
              }}
            />
            <div
              className="flex max-w-sm justify-between gap-2"
              aria-hidden="true"
            >
              {levels.map((entry) => (
                <span key={entry}>{labels[entry]}</span>
              ))}
            </div>
            <FieldDescription id={`${id}-selected`} aria-live="polite">
              {labels[level]}: {descriptions[level]}
            </FieldDescription>
            {invalid ? <FieldError>{t("errorLevel")}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>
    </ContainerMain>
  );
}
