"use client";

import { useId } from "react";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { Switch } from "@schornio/aibox-package-ui/components/switch";
import { AgentEditorRoleRemoveTool } from "./AgentEditorRoleRemoveTool";
import { useAgentEditor } from "./AgentEditor";

type SupportKind = "toolCalculator" | "toolChatAwareness";
export function AgentEditorRoleSupport({
  role,
  kind,
}: {
  role: Agent["roles"][number];
  kind: SupportKind;
}) {
  const { defaultAgent, setAgentRole } = useAgentEditor();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorRoleSupport",
  });
  const id = useId();
  const router = useRouter();
  const original = defaultAgent?.roles?.find((item) => item.id === role.id)?.[
    kind
  ];
  const config = role[kind];
  const update = (
    key: "updateChatLabel" | "recommendNextMessages" | "currentDateTime",
    checked: boolean,
  ) =>
    setAgentRole(role.id, (prev) => ({
      ...prev,
      [kind]: {
        ...prev[kind],
        active: true,
        [key]: checked,
      },
    }));
  return (
    <ContainerMain>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>
            {t(
              kind === "toolCalculator"
                ? "labelCalculator"
                : "labelChatSupport",
            )}{" "}
            <ButtonDiscardChanges
              objA={original}
              objB={config}
              variant="inline"
              onClick={() => {
                setAgentRole(role.id, (prev) => ({
                  ...prev,
                  [kind]: original,
                }));
                if (!original?.active)
                  router.push(`?view=roles#role-${role.id}`);
              }}
            />
          </FieldLegend>
          <FieldDescription>
            {t(
              kind === "toolCalculator"
                ? "descriptionCalculator"
                : "descriptionChatSupport",
            )}
          </FieldDescription>
          <FieldGroup>
            {kind === "toolChatAwareness" &&
              (
                [
                  "updateChatLabel",
                  "recommendNextMessages",
                  "currentDateTime",
                ] as const
              ).map((key) => (
                <Field key={key} orientation="horizontal">
                  <Switch
                    id={`${id}-${key}`}
                    checked={role.toolChatAwareness?.[key] ?? false}
                    onCheckedChange={(checked) => update(key, checked)}
                  />
                  <FieldLabel htmlFor={`${id}-${key}`}>
                    {t(`label_${key}`)}
                  </FieldLabel>
                </Field>
              ))}
          </FieldGroup>
        </FieldSet>
        <Field orientation="horizontal">
          <AgentEditorRoleRemoveTool roleId={role.id} tool={kind} />
        </Field>
      </FieldGroup>
    </ContainerMain>
  );
}
