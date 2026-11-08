"use client";
import {
  defaultPlatformAgentAccess,
  getPlatformApprovals,
  platformApprovalModes,
  platformPolicyCeiling,
  type PlatformApprovalMode,
} from "@schornio/aibox-package-database/mcp/platformAgentPolicy";
import { useId } from "react";
import { useT } from "next-i18next/client";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { platformAccessLevels } from "@schornio/aibox-package-database/mcp/platformAccess";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@schornio/aibox-package-ui/components/field";
import { AgentEditorRoleRemoveTool } from "./AgentEditorRoleRemoveTool";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
import { useAgentEditor } from "./AgentEditor";
export function AgentEditorRolePlatformAccess({
  role,
}: {
  role: Agent["roles"][number];
}) {
  const { setAgentRole } = useAgentEditor();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorRolePlatformAccess",
  });
  const id = useId();
  const config = role.toolPlatformAccess ?? {
    ...defaultPlatformAgentAccess,
    active: true,
  };
  const approvals = getPlatformApprovals(role.toolPlatformAccess);
  return (
    <ContainerMain>
      <FieldGroup>
        <FieldDescription>{t("description")}</FieldDescription>
        {platformAccessLevels.map((level) => (
          <Field key={level}>
            <FieldLabel htmlFor={`${id}-${level}`}>
              {t(`level.${level}`)}
            </FieldLabel>
            <Select
              value={approvals[level]}
              onValueChange={(value) => {
                if (
                  !platformApprovalModes.includes(value as PlatformApprovalMode)
                )
                  return;
                const next = {
                  ...approvals,
                  [level]: value as PlatformApprovalMode,
                };
                setAgentRole(role.id, (previous) => ({
                  ...previous,
                  toolPlatformAccess: {
                    ...config,
                    active: true,
                    approvals: next,
                    level: platformPolicyCeiling(next),
                  },
                }));
              }}
            >
              <SelectTrigger id={`${id}-${level}`}>
                <SelectValue>{t(`mode.${approvals[level]}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {platformApprovalModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {t(`mode.${mode}`)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ))}
        <FieldDescription>{t("descriptionModes")}</FieldDescription>
        <Field orientation="horizontal">
          <AgentEditorRoleRemoveTool
            roleId={role.id}
            tool="toolPlatformAccess"
          />
        </Field>
      </FieldGroup>
    </ContainerMain>
  );
}
