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
import { useAgentEditor } from "./AgentEditor";
import { useT } from "next-i18next/client";

export function AgentEditorSettingsWorkspace() {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorSettingsWorkspace",
  });

  const { agent, defaultAgent, setAgent, relations, validationErrors } =
    useAgentEditor();

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
                objA={defaultAgent?.workspaceId}
                objB={agent?.workspaceId}
                onClick={() =>
                  setAgent((prev) => ({
                    ...prev,
                    workspaceId: defaultAgent?.workspaceId,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Select
              aria-invalid={Boolean(validationErrors?.workspaceId)}
              onValueChange={(value) =>
                setAgent((prev) => ({
                  ...prev,
                  workspaceId: value ?? undefined,
                }))
              }
              items={workspaceSelectItems}
              value={agent?.workspaceId ?? null}
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
