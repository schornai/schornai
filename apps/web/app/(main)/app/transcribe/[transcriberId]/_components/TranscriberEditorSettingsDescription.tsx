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
import { useId } from "react";
import { useT } from "next-i18next/client";
import { useTranscriberEditor } from "./TranscriberEditor";

export function TranscriberEditorSettingsDescription() {
  const nameInputId = useId();
  const descriptionInputId = useId();

  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberEditorSettingsDescription",
  });

  const { transcriber, defaultTranscriber, setTranscriber } =
    useTranscriberEditor();

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
                objA={defaultTranscriber?.name}
                objB={transcriber?.name}
                onClick={() =>
                  setTranscriber((prev) => ({
                    ...prev,
                    name: defaultTranscriber?.name,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Input
              id={nameInputId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setTranscriber((prev) => ({ ...prev, name: value }));
              }}
              value={transcriber?.name ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={descriptionInputId}>
              {t("labelDescription")}{" "}
              <ButtonDiscardChanges
                objA={defaultTranscriber?.description}
                objB={transcriber?.description}
                onClick={() =>
                  setTranscriber((prev) => ({
                    ...prev,
                    description: defaultTranscriber?.description,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Textarea
              id={descriptionInputId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setTranscriber((prev) => ({ ...prev, description: value }));
              }}
              value={transcriber?.description ?? ""}
            />
          </Field>
        </FieldGroup>
      </FieldSet>
    </ContainerMain>
  );
}
