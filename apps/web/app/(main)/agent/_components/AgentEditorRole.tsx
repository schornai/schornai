"use client";
import { AgentEditorRoleSupport } from "./AgentEditorRoleSupport";
import { AgentEditorRolePlatformAccess } from "./AgentEditorRolePlatformAccess";

import {
  Bot,
  File,
  Globe,
  Plug,
  DraftingCompass,
  Calculator,
  MessageSquareQuote,
} from "lucide-react";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@schornio/aibox-package-ui/components/field";
import {
  TabsContent,
  TabsTrigger,
} from "@schornio/aibox-package-ui/components/tabs";
import { TabsSub, TabsSubList } from "../../../_components/Tabs";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AgentEditorRoleDocumentRepositoryMounts } from "./AgentEditorRoleDocumentRepositoryMounts";
import { AgentEditorRoleMCPs } from "./AgentEditorRoleMCPs";
import { AgentEditorRoleSettings } from "./AgentEditorRoleSettings";
import { AgentEditorRoleWebAccess } from "./AgentEditorRoleWebAccess";
import { AgentEditorRoleTools } from "./AgentEditorRoleTools";
import { AgentInfoRole } from "./AgentInfoRole";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useAgentEditor } from "./AgentEditor";
import { useId } from "react";
import { useSearchParams } from "next/navigation";
import { useT } from "next-i18next/client";

export function AgentEditorRole({
  role,
  roleIndex,
}: {
  role: Agent["roles"][number];
  roleIndex: number;
}) {
  const inputPromtId = useId();
  const selectedTab = useSearchParams().get(`role-${role.id}`);
  const unavailableTab =
    (selectedTab === "tool-calculator" && !role.toolCalculator?.active) ||
    (selectedTab === "tool-chat-extensions" &&
      !role.toolChatAwareness?.active) ||
    (selectedTab === "tool-platform" && !role.toolPlatformAccess?.active);

  const { agent, defaultAgent, setAgentRole, hasValidationError, relations } =
    useAgentEditor();

  const defaultRole = defaultAgent?.roles?.find(($) => $.id === role.id);

  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorRole",
  });

  return (
    <>
      <ContainerMain
        className="scroll-mt-32 text-center"
        id={`role-${role.id}`}
      >
        {(agent?.roles?.length ?? 0) > 1 ? (
          <h2 className="text-2xl">
            {t("labelRole")} <strong>{role.name}</strong>{" "}
            <ButtonDiscardChanges
              objA={defaultRole}
              objB={role}
              onClick={() => setAgentRole(role.id, defaultRole)}
              variant="inline"
            />
          </h2>
        ) : undefined}
        <div className="text-muted-foreground text-sm">{t("description")}</div>
      </ContainerMain>
      <TabsSub
        searchParamsKey={`role-${role.id}`}
        {...(unavailableTab ? { value: "default" } : {})}
      >
        <TabsSubList>
          <TabsTrigger value="default">{t("tabOverview")}</TabsTrigger>

          <TabsTrigger value="prompt">
            <Bot /> {t("tabPrompt")}
          </TabsTrigger>

          {role.documentRepositoryMounts.length > 0 ? (
            <TabsTrigger value="documentRepositoryMounts">
              <File /> {t("tabDocumentRepositoryMounts")}
            </TabsTrigger>
          ) : undefined}

          {(role.mcps?.length ?? 0) > 0 ? (
            <TabsTrigger
              className={cn({
                "text-destructive": hasValidationError(
                  "roles",
                  roleIndex,
                  "mcps",
                ),
              })}
              value="mcps"
            >
              <Plug /> {t("tabMCPs")}
            </TabsTrigger>
          ) : undefined}

          {role.toolWebAccess ? (
            <TabsTrigger
              className={cn({
                "text-destructive": hasValidationError(
                  "roles",
                  roleIndex,
                  "toolWebAccess",
                ),
              })}
              value="tool-web"
            >
              <Globe /> {t("tabWeb")}
            </TabsTrigger>
          ) : undefined}

          {role.toolChatAwareness?.active && (
            <TabsTrigger value="tool-chat-extensions">
              <MessageSquareQuote />
              {t("tabChatSupport")}
            </TabsTrigger>
          )}
          {role.toolCalculator?.active && (
            <TabsTrigger value="tool-calculator">
              <Calculator />
              {t("tabCalculator")}
            </TabsTrigger>
          )}
          {role.toolPlatformAccess?.active && (
            <TabsTrigger value="tool-platform">
              <DraftingCompass />
              {t("tabPlatform")}
            </TabsTrigger>
          )}
          <TabsTrigger value="tools">{t("tabTools")}</TabsTrigger>

          <TabsTrigger value="settings">{t("tabSettings")}</TabsTrigger>
        </TabsSubList>

        <TabsContent value="default">
          <ContainerMain className="flex flex-col gap-1">
            <AgentInfoRole
              documentRepositoryMap={
                new Map(
                  relations.documentRepositories.map((repo) => [
                    repo.identifier,
                    repo,
                  ]),
                )
              }
              editDefaultRole={defaultAgent?.roles?.find(
                ($) => $.id === role.id,
              )}
              editable={true}
              modelMap={
                new Map(
                  relations.models.map((model) => [model.identifier, model]),
                )
              }
              role={role}
            />
          </ContainerMain>
        </TabsContent>
        <TabsContent value="prompt">
          <ContainerMain>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={inputPromtId}>
                  {t("labelPrompt")}{" "}
                  <ButtonDiscardChanges
                    objA={defaultRole?.prompt ?? ""}
                    objB={role?.prompt ?? ""}
                    onClick={() =>
                      setAgentRole(role.id, (prev) => ({
                        ...prev,
                        prompt: defaultRole?.prompt ?? "",
                      }))
                    }
                    variant="inline"
                  />
                </FieldLabel>
                <Textarea
                  className="min-h-[16ch] font-mono"
                  id={inputPromtId}
                  onChange={(event) => {
                    const prompt = event.currentTarget.value;
                    setAgentRole(role.id, (prev) => ({ ...prev, prompt }));
                  }}
                  value={role.prompt}
                />
              </Field>
            </FieldGroup>
          </ContainerMain>
        </TabsContent>

        <TabsContent value="documentRepositoryMounts">
          <AgentEditorRoleDocumentRepositoryMounts
            documentRepositoryMounts={role.documentRepositoryMounts}
            roleId={role.id}
          />
        </TabsContent>

        <TabsContent value="mcps">
          <AgentEditorRoleMCPs
            mcps={role.mcps}
            roleId={role.id}
            roleIndex={roleIndex}
          />
        </TabsContent>

        <TabsContent value="tool-web">
          <AgentEditorRoleWebAccess role={role} />
        </TabsContent>

        {role.toolPlatformAccess?.active && (
          <TabsContent value="tool-platform">
            <AgentEditorRolePlatformAccess role={role} />
          </TabsContent>
        )}
        {role.toolCalculator?.active && (
          <TabsContent value="tool-calculator">
            <AgentEditorRoleSupport role={role} kind="toolCalculator" />
          </TabsContent>
        )}
        {role.toolChatAwareness?.active && (
          <TabsContent value="tool-chat-extensions">
            <AgentEditorRoleSupport role={role} kind="toolChatAwareness" />
          </TabsContent>
        )}
        <TabsContent value="tools">
          <AgentEditorRoleTools roleId={role.id} />
        </TabsContent>

        <TabsContent value="settings">
          <AgentEditorRoleSettings role={role} />
        </TabsContent>
      </TabsSub>

      <hr className="my-10" />
    </>
  );
}
