"use client";

import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AgentCard } from "./AgentCard";
import { AgentInfoAdditionalFunctions } from "./AgentInfoAdditionalFunctions";
import { AgentInfoDocs } from "./AgentInfoDocs";
import { AgentInfoModel } from "./AgentInfoModel";
import { AgentInfoRecommendedMessages } from "./AgentInfoRecommendedMessages";
import { AgentInfoRole } from "./AgentInfoRole";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { Fragment } from "react/jsx-runtime";
import { InfoWorkspace } from "../../../_components/InfoWorkspace";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import { Shapes } from "lucide-react";
import type { WorkspaceClaim } from "../../../_models/getWorkspaceClaims";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useT } from "next-i18next/client";

export function AgentInfo({
  agent,
  documentRepositoryMap,
  editAgentPathname,
  editDefaultAgent,
  editable,
  favorites,
  modelMap,
  workspace,
}: {
  agent?: Partial<Agent>;
  documentRepositoryMap: Map<string | symbol, DocumentRepository>;
  editAgentPathname?: string;
  editDefaultAgent?: Partial<Agent>;
  editable?: boolean;
  favorites?: SettingFavorites;
  modelMap?: Map<string | symbol, AIModel>;
  workspace?: WorkspaceClaim;
}) {
  const model = agent?.modelIdentifier
    ? modelMap?.get(agent?.modelIdentifier)
    : undefined;

  const { t } = useT("agent", {
    keyPrefix: "_components.AgentInfo",
  });

  return (
    <ContainerMain className="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr]">
      <AgentCard
        documentRepositoryMap={documentRepositoryMap}
        agent={agent}
        favorites={favorites}
        model={model}
        workspace={workspace}
      />
      <div className="flex flex-col gap-1">
        {agent?.roles?.map((role) => (
          <Fragment key={role.id}>
            {(agent?.roles?.length ?? 0) > 1 ? (
              <p className="flex items-center gap-1 text-sm font-medium">
                <Shapes className="inline size-4" /> {t("labelRole")}
                <strong>{role.name}</strong>
              </p>
            ) : undefined}
            <AgentInfoRole
              className={cn({
                "ml-2 border-l pl-2": (agent?.roles?.length ?? 0) > 1,
              })}
              documentRepositoryMap={documentRepositoryMap}
              editDefaultRole={editDefaultAgent?.roles?.find(
                ($) => $.id === role.id,
              )}
              editable={editable}
              editAgentPathname={editAgentPathname}
              modelMap={modelMap}
              role={role}
            />
          </Fragment>
        ))}
        {agent?.modelIdentifier ? (
          <AgentInfoModel
            editAgentPathname={editAgentPathname}
            editDefaultModelIdentifier={editDefaultAgent?.modelIdentifier}
            editDefaultModelThinking={editDefaultAgent?.modelThinking}
            editable={editable}
            modelIdentifier={agent?.modelIdentifier}
            modelThinking={agent.modelThinking}
            model={model}
          />
        ) : undefined}
        {agent?.documentation ? (
          <AgentInfoDocs
            docs={agent.documentation}
            editAgentPathname={editAgentPathname}
            editDefaultDocs={editDefaultAgent?.documentation}
            editable={editable}
          />
        ) : undefined}
        {(agent?.recommendedMessages?.length ?? 0) > 0 ? (
          <AgentInfoRecommendedMessages
            agent={agent}
            editAgentPathname={editAgentPathname}
            editDefaultAgent={editDefaultAgent}
            editable={editable}
          />
        ) : undefined}
        <InfoWorkspace
          editPathname={editAgentPathname}
          editDefaultWorkspaceId={editDefaultAgent?.workspaceId}
          editable={editable}
          workspace={workspace}
        />
        <AgentInfoAdditionalFunctions
          agent={agent}
          editable={editable}
          editAgentPathname={editAgentPathname}
        />
      </div>
    </ContainerMain>
  );
}
