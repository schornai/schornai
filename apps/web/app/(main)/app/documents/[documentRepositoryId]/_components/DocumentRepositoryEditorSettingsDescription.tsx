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
import { useDocumentRepositoryEditor } from "./DocumentRepositoryEditor";
import { useId } from "react";
import { useT } from "next-i18next/client";

export function DocumentRepositoryEditorSettingsDescription() {
  const nameInputId = useId();
  const descriptionInputId = useId();

  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryEditorSettingsDescription",
  });

  const {
    defaultDocumentRepository,
    documentRepository,
    setDocumentRepository,
  } = useDocumentRepositoryEditor();

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
                objA={defaultDocumentRepository?.name}
                objB={documentRepository?.name}
                onClick={() =>
                  setDocumentRepository((prev) => ({
                    ...prev,
                    name: defaultDocumentRepository?.name,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Input
              id={nameInputId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDocumentRepository((prev) => ({ ...prev, name: value }));
              }}
              value={documentRepository?.name ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={descriptionInputId}>
              {t("labelDescription")}{" "}
              <ButtonDiscardChanges
                objA={defaultDocumentRepository?.description}
                objB={documentRepository?.description}
                onClick={() =>
                  setDocumentRepository((prev) => ({
                    ...prev,
                    description: defaultDocumentRepository?.description,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Textarea
              id={descriptionInputId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDocumentRepository((prev) => ({
                  ...prev,
                  description: value,
                }));
              }}
              value={documentRepository?.description ?? ""}
            />
          </Field>
        </FieldGroup>
      </FieldSet>
    </ContainerMain>
  );
}
