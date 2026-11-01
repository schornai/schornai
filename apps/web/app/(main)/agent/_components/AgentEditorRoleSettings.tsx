"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { Minus, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { useAgentEditor } from "./AgentEditor";
import { useId } from "react";
import { useT } from "next-i18next/client";

export function AgentEditorRoleSettings({
  role,
}: {
  role: Agent["roles"][number];
}) {
  const notSetId = useId();
  const nameInputId = useId();
  const hintInputId = useId();
  const selectModelIdentifierId = useId();
  const selectModelThinkingId = useId();

  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorRoleSettings",
  });

  const { defaultAgent, setAgentRole, relations } = useAgentEditor();

  const defaultRole = defaultAgent?.roles?.find(($) => $.id === role.id);

  const modelSelectItems = [
    { label: t("labelDoNotOverride"), value: notSetId },
    ...relations.models
      .filter(
        (model) =>
          model.type === "ollama_llm_v1" || model.type === "external_llm_v1",
      )
      .map((model) => ({
        label: model.name,
        value: model.identifier,
      })),
  ];

  const modelThinkingSelectItems = [
    { label: t("labelDoNotOverride"), value: notSetId },
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
    <ContainerMain className="flex flex-col items-start">
      <FieldSet
        id={`role-${role.id}-role-name`}
        className="w-full scroll-mt-32"
      >
        <FieldLegend>{t("labelRoleDescription")}</FieldLegend>
        <FieldDescription>{t("description")}</FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={nameInputId}>
              {t("labelName")}{" "}
              <ButtonDiscardChanges
                objA={defaultRole?.name ?? ""}
                objB={role?.name ?? ""}
                onClick={() =>
                  setAgentRole(role.id, (prev) => ({
                    ...prev,
                    name: defaultRole?.name ?? "",
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Input
              id={nameInputId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setAgentRole(role.id, (prev) => ({ ...prev, name: value }));
              }}
              value={role.name ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={hintInputId}>
              {t("labelSelectionHint")}{" "}
              <ButtonDiscardChanges
                objA={defaultRole?.roleSelectionHint ?? ""}
                objB={role?.roleSelectionHint ?? ""}
                onClick={() =>
                  setAgentRole(role.id, (prev) => ({
                    ...prev,
                    roleSelectionHint: defaultRole?.roleSelectionHint ?? "",
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Textarea
              id={hintInputId}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setAgentRole(role.id, (prev) => ({
                  ...prev,
                  roleSelectionHint: value,
                }));
              }}
              value={role.roleSelectionHint ?? ""}
            />
          </Field>
        </FieldGroup>
      </FieldSet>

      <hr className="my-5 w-full border-dashed" />

      <FieldSet
        id={`role-${role.id}-model-override`}
        className="w-full scroll-mt-32"
      >
        <FieldLegend>{t("labelOverrideModel")}</FieldLegend>
        <FieldDescription>{t("descriptionOverrideModel")}</FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={selectModelIdentifierId}>
              {t("labelName")}{" "}
              <ButtonDiscardChanges
                objA={defaultRole?.modelIdentifierOverride}
                objB={role?.modelIdentifierOverride}
                onClick={() =>
                  setAgentRole(role.id, (prev) => ({
                    ...prev,
                    modelIdentifierOverride:
                      defaultRole?.modelIdentifierOverride,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Select
              id={selectModelIdentifierId}
              items={modelSelectItems}
              onValueChange={(value) =>
                setAgentRole(role.id, (prev) => ({
                  ...prev,
                  modelIdentifierOverride:
                    value === notSetId || value === null ? undefined : value,
                }))
              }
              value={role.modelIdentifierOverride ?? notSetId}
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
          </Field>
          <Field>
            <FieldLabel htmlFor={selectModelThinkingId}>
              {t("labelThinking")}{" "}
              <ButtonDiscardChanges
                objA={defaultRole?.modelThinkingOverride}
                objB={role?.modelThinkingOverride}
                onClick={() =>
                  setAgentRole(role.id, (prev) => ({
                    ...prev,
                    modelThinkingOverride: defaultRole?.modelThinkingOverride,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <Select
              id={selectModelThinkingId}
              items={modelThinkingSelectItems}
              onValueChange={(value) =>
                setAgentRole(role.id, (prev) => ({
                  ...prev,
                  modelThinkingOverride:
                    value === notSetId || value === null
                      ? undefined
                      : (value as Agent["roles"][number]["modelThinkingOverride"]),
                }))
              }
              value={role.modelThinkingOverride ?? notSetId}
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

      <hr className="my-5 w-full border-dashed" />

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button className="ml-auto" variant="destructive">
              {t("labelDeleteRole")} <Minus />
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMediaDestructive>
              <XCircle />
            </AlertDialogMediaDestructive>
            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteDescription", { name: role.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("labelCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setAgentRole(role.id, undefined);
              }}
              variant="destructive"
            >
              {t("labelDeleteRole")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContainerMain>
  );
}
