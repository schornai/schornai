"use client";

import { AlertDescription } from "@schornio/aibox-package-ui/components/alert";
import { BotMessageSquare, Lightbulb, Settings2, Shapes } from "lucide-react";
import {
  Checklist,
  ChecklistItem,
  ChecklistItemContent,
  ChecklistItemHeader,
  ChecklistItemIndicator,
} from "@schornio/aibox-package-ui/components/checklist";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { AgentInfoRole } from "./AgentInfoRole";
import { AgentInfoDocs } from "./AgentInfoDocs";
import { AgentInfoRecommendedMessages } from "./AgentInfoRecommendedMessages";
import { AgentInfoAdditionalFunctions } from "./AgentInfoAdditionalFunctions";
import { AgentInfoModel } from "./AgentInfoModel";
import { InfoWorkspace } from "../../../_components/InfoWorkspace";
import { InfoTranscriber } from "../../../_components/InfoTranscriber";
import { EditorOverviewSection } from "../../../_components/EditorOverviewSection";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { useAgentEditor } from "./AgentEditor";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function AgentEditorOverview({ mode }: { mode: "create" | "update" }) {
  const router = useRouter();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorOverview",
  });
  const { agent, defaultAgent, relations } = useAgentEditor();

  const documentRepositoryMap = new Map(
    relations.documentRepositories.map((repo) => [repo.identifier, repo]),
  );

  const modelMap = new Map(
    relations.models.map((model) => [model.identifier, model]),
  );

  const workspace = relations.workspaces.find(
    (workspace) => workspace.id === agent?.workspaceId,
  );

  const { t: tab } = useT("agent", { keyPrefix: "_components.AgentEditor" });
  const model = agent?.modelIdentifier
    ? modelMap.get(agent.modelIdentifier)
    : undefined;
  return (
    <>
      {mode === "create" ? (
        <>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BotMessageSquare />
              </EmptyMedia>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <AlertDescription>{t("emptyDescription")}</AlertDescription>
            </EmptyHeader>
          </Empty>

          <ContainerMain size="narrow">
            <Checklist>
              <ChecklistItem>
                <ChecklistItemIndicator
                  variant={
                    agent?.roles?.some((role) => role.prompt.trim().length > 0)
                      ? "success"
                      : undefined
                  }
                />
                <ChecklistItemHeader
                  className="cursor-pointer"
                  onClick={() => {
                    const firstRoleId = agent?.roles?.[0]?.id;
                    if (firstRoleId) {
                      router.push(
                        `?view=roles&role-${firstRoleId}=prompt#role-${firstRoleId}`,
                      );
                    } else {
                      router.push(`?view=roles`);
                    }
                  }}
                >
                  {t("labelDefinePrompt")}
                </ChecklistItemHeader>
                <ChecklistItemContent>
                  {t("descriptionDefinePrompt")}
                </ChecklistItemContent>
              </ChecklistItem>
              <ChecklistItem>
                <ChecklistItemIndicator
                  variant={
                    agent?.roles?.some(
                      (role) =>
                        role.documentRepositoryMounts.length > 0 ||
                        (role.mcps?.length ?? 0) > 0 ||
                        role.toolWebAccess ||
                        role.toolCalculator?.active ||
                        role.toolChatAwareness?.active ||
                        role.toolPlatformAccess?.active,
                    )
                      ? "success"
                      : undefined
                  }
                />
                <ChecklistItemHeader
                  className="cursor-pointer"
                  onClick={() => {
                    const firstRoleId = agent?.roles?.[0]?.id;
                    if (firstRoleId) {
                      router.push(
                        `?view=roles&role-${firstRoleId}=tools#role-${firstRoleId}`,
                      );
                    } else {
                      router.push(`?view=roles`);
                    }
                  }}
                >
                  {t("labelConnectTools")}
                </ChecklistItemHeader>
                <ChecklistItemContent>
                  {t("descriptionConnectTools")}
                </ChecklistItemContent>
              </ChecklistItem>
              <ChecklistItem>
                <ChecklistItemIndicator
                  variant={
                    (agent?.documentation?.trim().length ?? 0) > 0 ||
                    (agent?.recommendedMessages?.length ?? 0) > 0
                      ? "success"
                      : undefined
                  }
                />

                <ChecklistItemHeader
                  className="cursor-pointer"
                  onClick={() => router.push("?view=docs")}
                >
                  {t("labelWriteDocs")}
                </ChecklistItemHeader>
                <ChecklistItemContent>
                  {t("descriptionWriteDocs")}
                </ChecklistItemContent>
              </ChecklistItem>
            </Checklist>
          </ContainerMain>

          <hr className="my-10" />
        </>
      ) : undefined}

      <ContainerMain className="flex flex-col gap-4">
        <EditorOverviewSection
          view="roles"
          icon={Shapes}
          title={tab("tabRoles")}
          description={t("infoRoleDefinition")}
        >
          {agent?.roles?.map((role) => (
            <div key={role.id} className="flex min-w-0 flex-col gap-1">
              {(agent?.roles?.length ?? 0) > 1 && (
                <h3 className="truncate text-sm font-medium">{role.name}</h3>
              )}
              <AgentInfoRole
                role={role}
                documentRepositoryMap={documentRepositoryMap}
                modelMap={modelMap}
                editDefaultRole={defaultAgent?.roles?.find(
                  (item) => item.id === role.id,
                )}
                editable
              />
            </div>
          ))}
        </EditorOverviewSection>
        <EditorOverviewSection
          view="docs"
          icon={Lightbulb}
          title={tab("tabDocs")}
          description={t("infoDocsDescription")}
        >
          {agent?.documentation && (
            <AgentInfoDocs
              docs={agent.documentation}
              editDefaultDocs={defaultAgent?.documentation}
              editable
            />
          )}
          {Boolean(agent?.recommendedMessages?.length) && (
            <AgentInfoRecommendedMessages
              agent={agent}
              editDefaultAgent={defaultAgent}
              editable
            />
          )}
        </EditorOverviewSection>
        <EditorOverviewSection
          view="settings"
          icon={Settings2}
          title={tab("tabSettings")}
          description={t("infoAppearanceDescription")}
        >
          {agent?.modelIdentifier && (
            <AgentInfoModel
              model={model}
              modelIdentifier={agent.modelIdentifier}
              modelThinking={agent.modelThinking}
              editDefaultModelIdentifier={defaultAgent?.modelIdentifier}
              editDefaultModelThinking={defaultAgent?.modelThinking}
              editable
            />
          )}
          <InfoWorkspace
            workspace={workspace}
            editDefaultWorkspaceId={defaultAgent?.workspaceId}
            editable
          />
          {agent?.transcriberIdentifier && (
            <InfoTranscriber
              transcriberIdentifier={agent.transcriberIdentifier}
              editDefaultTranscriberIdentifier={
                defaultAgent?.transcriberIdentifier
              }
              editHref="?view=settings#additionalFunctions"
              transcriber={relations.transcribers?.find(
                (item) => item.identifier === agent.transcriberIdentifier,
              )}
            />
          )}
          <AgentInfoAdditionalFunctions agent={agent} editable />
        </EditorOverviewSection>
      </ContainerMain>
    </>
  );
}
