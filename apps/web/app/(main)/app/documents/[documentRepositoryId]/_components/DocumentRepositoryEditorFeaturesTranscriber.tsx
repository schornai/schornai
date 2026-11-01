"use client";

import {
  Field,
  FieldDescription,
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
import { useDocumentRepositoryEditor } from "./DocumentRepositoryEditor";
import { useId } from "react";
import { useT } from "next-i18next/client";

export function DocumentRepositoryEditorFeaturesTranscriber() {
  const transcriptorSelectId = useId();

  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryEditorFeaturesTranscriber",
  });

  const {
    defaultDocumentRepository,
    documentRepository,
    relations,
    setDocumentRepository,
  } = useDocumentRepositoryEditor();

  const transcriberItems = [
    {
      label: t("labelNoTranscriber"),
      value: null,
    },
    ...relations.transcribers.map((transcriber) => ({
      label: transcriber.name,
      value: transcriber.identifier,
    })),
  ];

  return (
    <ContainerMain id="transcribe" className="scroll-mt-32">
      <FieldSet>
        <FieldLegend>{t("labelLegend")}</FieldLegend>
        <FieldDescription>{t("description")}</FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={transcriptorSelectId}>
              {t("labelTranscriber")}{" "}
              <ButtonDiscardChanges
                objA={defaultDocumentRepository?.transcriberIdentifier}
                objB={documentRepository?.transcriberIdentifier}
                onClick={() =>
                  setDocumentRepository((prev) => ({
                    ...prev,
                    transcriberIdentifier:
                      defaultDocumentRepository?.transcriberIdentifier,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Select
              onValueChange={(value) =>
                setDocumentRepository((prev) => ({
                  ...prev,
                  transcriberIdentifier: value ?? undefined,
                }))
              }
              id={transcriptorSelectId}
              items={transcriberItems}
              value={documentRepository?.transcriberIdentifier ?? null}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {transcriberItems.map((transcriberItem) => (
                    <SelectItem
                      key={transcriberItem.value}
                      value={transcriberItem.value}
                    >
                      {transcriberItem.label}
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
