"use client";
import { ResourceRemovalDialog } from "../../../_components/ResourceRemovalDialog";
import { deleteAgent } from "../_actions/deleteAgent";
import { useAction } from "next-safe-action/hooks";
import { ResourceInfoLayout } from "../../../_components/ResourceInfoLayout";
import { AgentIconGroupActions } from "./AgentIconGroupActions";
import { hasPermission } from "@/lib/hasPermission";
import { XRAGObjectActions } from "../../../_components/xrag/XRAGObjectActions";

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
import { InfoTranscriber } from "../../../_components/InfoTranscriber";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import { InfoWorkspace } from "../../../_components/InfoWorkspace";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import { Shapes } from "lucide-react";
import type { WorkspaceClaim } from "../../../_models/getWorkspaceClaims";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useT } from "next-i18next/client";

export function AgentInfo({
  showResourceActions = false,
  preview = false,
  agent,
  documentRepositoryMap,
  editAgentPathname,
  editDefaultAgent,
  editable,
  favorites,
  modelMap,
  transcriber,
  workspace,
}: {
  showResourceActions?: boolean;
  preview?: boolean;
  agent?: Partial<Agent>;
  documentRepositoryMap: Map<string | symbol, DocumentRepository>;
  editAgentPathname?: string;
  editDefaultAgent?: Partial<Agent>;
  editable?: boolean;
  favorites?: SettingFavorites;
  modelMap?: Map<string | symbol, AIModel>;
  transcriber?: Pick<Transcriber_new, "id" | "name" | "description">;
  workspace?: WorkspaceClaim;
}) {
  const model = agent?.modelIdentifier
    ? modelMap?.get(agent?.modelIdentifier)
    : undefined;

  const { t } = useT("agent", {
    keyPrefix: "_components.AgentInfo",
  });

  const { t: editorText } = useT("agent", {
    keyPrefix: "_components.AgentEditor",
  });
  const remove = useAction(deleteAgent);
  const id = agent?.id;
  const canManage = hasPermission({
    claim: workspace?.claim,
    permission: "workspace-admin",
  });
  return (
    <ContainerMain>
      <ResourceInfoLayout
        card={
          <AgentCard
            fullDescription
            preview={preview}
            documentRepositoryMap={documentRepositoryMap}
            agent={agent}
            favorites={favorites}
            model={model}
            workspace={workspace}
          />
        }
        actions={
          showResourceActions &&
          !preview &&
          id && (
            <AgentIconGroupActions
              display="buttons"
              favorites={favorites}
              workspace={workspace}
              agent={agent}
              packageActions={
                canManage && <XRAGObjectActions kind="agent" id={id} />
              }
              remove={
                canManage && (
                  <ResourceRemovalDialog
                    label={editorText("labelDeleteAgent")}
                    title={editorText("confirmDeleteTitle")}
                    description={editorText("confirmDeleteDescription", {
                      name: agent?.name,
                    })}
                    cancel={editorText("labelCancel")}
                    onOpen={remove.reset}
                    isPending={remove.isPending}
                    hasErrored={remove.hasErrored}
                    onConfirm={() => remove.execute({ agentId: id })}
                  />
                )
              }
            />
          )
        }
      >
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
            agent={preview ? { ...agent, id: undefined } : agent}
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
        {agent?.transcriberIdentifier && (
          <InfoTranscriber
            transcriberIdentifier={agent.transcriberIdentifier}
            editDefaultTranscriberIdentifier={
              editDefaultAgent?.transcriberIdentifier
            }
            editHref={
              editable && (!showResourceActions || canManage)
                ? `${editAgentPathname ?? ""}?view=settings#additionalFunctions`
                : undefined
            }
            transcriber={transcriber}
          />
        )}
        <AgentInfoAdditionalFunctions
          agent={agent}
          editable={editable}
          editAgentPathname={editAgentPathname}
        />
      </ResourceInfoLayout>
    </ContainerMain>
  );
}
