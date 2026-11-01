"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { Search, VectorPolygon } from "lucide-react";
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
import { Switch } from "@schornio/aibox-package-ui/components/switch";
import { useDocumentRepositoryEditor } from "./DocumentRepositoryEditor";
import { useId } from "react";
import { useT } from "next-i18next/client";

export function DocumentRepositoryEditorFeaturesIndex() {
  const indexKeywordSwitchId = useId();
  const indexEmbeddingSwitchId = useId();

  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryEditorFeaturesIndex",
  });

  const {
    defaultDocumentRepository,
    documentRepository,
    relations,
    setDocumentRepository,
  } = useDocumentRepositoryEditor();

  const modelItems = relations.models
    .filter((model) => model.type === "ollama_embedding_v1")
    .map((model) => ({ label: model.name, value: model.identifier }));

  return (
    <ContainerMain id="index" className="scroll-mt-32">
      <FieldSet>
        <FieldLegend>{t("labelLegend")}</FieldLegend>
        <FieldDescription>{t("description")}</FieldDescription>
        <FieldGroup>
          <Field orientation="horizontal">
            <Switch
              checked={documentRepository?.index?.keyword?.active ?? false}
              id={indexKeywordSwitchId}
              onCheckedChange={(checked) =>
                setDocumentRepository((prev) => ({
                  ...prev,
                  index: { ...prev?.index, keyword: { active: checked } },
                }))
              }
            />
            <FieldContent>
              <FieldLabel htmlFor={indexKeywordSwitchId}>
                <Search className="inline size-4" /> {t("labelKeyword")}
                <ButtonDiscardChanges
                  objA={
                    defaultDocumentRepository?.index?.keyword?.active ?? false
                  }
                  objB={documentRepository?.index?.keyword?.active ?? false}
                  onClick={() =>
                    setDocumentRepository((prev) => ({
                      ...prev,
                      index: {
                        ...prev?.index,
                        keyword: {
                          active:
                            defaultDocumentRepository?.index?.keyword?.active ??
                            false,
                        },
                      },
                    }))
                  }
                  variant="inline"
                />
              </FieldLabel>
              <FieldDescription>{t("descriptionKeyword")}</FieldDescription>
            </FieldContent>
          </Field>
          <Field orientation="horizontal">
            <Switch
              checked={documentRepository?.index?.embedding?.active ?? false}
              id={indexEmbeddingSwitchId}
              onCheckedChange={(checked) =>
                setDocumentRepository((prev) => ({
                  ...prev,
                  index: {
                    ...prev?.index,
                    embedding: { ...prev?.index?.embedding, active: checked },
                  },
                }))
              }
            />
            <FieldContent>
              <FieldLabel htmlFor={indexEmbeddingSwitchId}>
                <VectorPolygon className="inline size-4" /> {t("labelSemantic")}
                <ButtonDiscardChanges
                  objA={
                    defaultDocumentRepository?.index?.embedding?.active ?? false
                  }
                  objB={documentRepository?.index?.embedding?.active ?? false}
                  onClick={() =>
                    setDocumentRepository((prev) => ({
                      ...prev,
                      index: {
                        ...prev?.index,
                        embedding: {
                          ...prev?.index?.embedding,
                          active:
                            defaultDocumentRepository?.index?.embedding
                              ?.active ?? false,
                        },
                      },
                    }))
                  }
                  variant="inline"
                />
              </FieldLabel>
              <FieldDescription>{t("descriptionSemantic")}</FieldDescription>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>
              {t("labelEmbeddingModel")}
              <ButtonDiscardChanges
                objA={
                  defaultDocumentRepository?.index?.embedding?.modelIdentifier
                }
                objB={documentRepository?.index?.embedding?.modelIdentifier}
                onClick={() =>
                  setDocumentRepository((prev) => ({
                    ...prev,
                    index: {
                      ...prev?.index,
                      embedding: {
                        ...prev?.index?.embedding,
                        active: prev?.index?.embedding?.active ?? false,
                        modelIdentifier:
                          defaultDocumentRepository?.index?.embedding
                            ?.modelIdentifier,
                        modelVectorSize:
                          defaultDocumentRepository?.index?.embedding?.modelVectorSize,
                      },
                    },
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Select
              disabled={!documentRepository?.index?.embedding?.active}
              onValueChange={(value) => {
                const model = relations.models
                  .filter((model) => model.type === "ollama_embedding_v1")
                  .find((model) => model.identifier === value);

                setDocumentRepository((prev) => ({
                  ...prev,
                  index: {
                    ...prev?.index,
                    embedding: {
                      ...prev?.index?.embedding,
                      active: prev?.index?.embedding?.active ?? false,
                      modelIdentifier: model?.identifier,
                      modelVectorSize: model?.config.embeddingVectorSize,
                    },
                  },
                }));
              }}
              items={modelItems}
              value={
                documentRepository?.index?.embedding?.modelIdentifier ?? null
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {modelItems.map((modelItem) => (
                    <SelectItem key={modelItem.value} value={modelItem.value}>
                      {modelItem.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              {t("descriptionEmbeddingModel")}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>
    </ContainerMain>
  );
}
