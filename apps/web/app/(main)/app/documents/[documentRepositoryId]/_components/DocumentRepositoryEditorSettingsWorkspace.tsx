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
import { hasPermission } from "@/lib/hasPermission";
import { useDocumentRepositoryEditor } from "./DocumentRepositoryEditor";
import { useT } from "next-i18next/client";

export function DocumentRepositoryEditorSettingsWorkspace() {
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryEditorSettingsWorkspace",
  });

  const {
    defaultDocumentRepository,
    documentRepository,
    setDocumentRepository,
    relations,
    validationErrors,
  } = useDocumentRepositoryEditor();

  const workspaceSelectItems = relations.workspaces
    .filter((workspace) =>
      hasPermission({ claim: workspace.claim, permission: "workspace-admin" }),
    )
    .map((workspace) => ({
      label: workspace.name,
      value: workspace.id,
    }));

  return (
    <ContainerMain id="workspace" className="scroll-mt-32">
      <FieldSet>
        <FieldLegend>{t("labelLegend")}</FieldLegend>
        <FieldDescription>{t("description")}</FieldDescription>
        <FieldGroup>
          <Field data-invalid={Boolean(validationErrors?.workspaceId)}>
            <FieldLabel>
              {t("labelName")}{" "}
              <ButtonDiscardChanges
                objA={defaultDocumentRepository?.workspaceId}
                objB={documentRepository?.workspaceId}
                onClick={() =>
                  setDocumentRepository((prev) => ({
                    ...prev,
                    workspaceId: defaultDocumentRepository?.workspaceId,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Select
              aria-invalid={Boolean(validationErrors?.workspaceId)}
              onValueChange={(value) =>
                setDocumentRepository((prev) => ({
                  ...prev,
                  workspaceId: value ?? undefined,
                }))
              }
              items={workspaceSelectItems}
              value={documentRepository?.workspaceId ?? null}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {workspaceSelectItems.map((workspaceItem) => (
                    <SelectItem
                      key={workspaceItem.value}
                      value={workspaceItem.value}
                    >
                      {workspaceItem.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {validationErrors?.workspaceId ? (
              <FieldError>{t("labelSelectWorkspace")}</FieldError>
            ) : undefined}
          </Field>
        </FieldGroup>
      </FieldSet>
    </ContainerMain>
  );
}
