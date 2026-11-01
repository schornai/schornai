"use client";

import { NO_GROUP_KEY, toKey } from "@/lib/groupSortView/hook";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { AgentCard } from "./AgentCard";
import { AgentListCardsContainer } from "./AgentListCardsContainer";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { Fragment } from "react/jsx-runtime";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import { UserRoleIcon } from "../../../_components/UserRoleIcon";
import { UserRoleText } from "../../../_components/UserRoleText";
import type { WorkspaceClaims } from "../../../_models/getWorkspaceClaims";
import { useAgentList } from "./AgentListProvider";
import { useT } from "next-i18next/client";

export function AgentListCards({
  documentRepositoryMap,
  favorites,
  modelMap,
  workspaceMap,
}: {
  documentRepositoryMap: Map<string | symbol, DocumentRepository>;
  favorites: SettingFavorites;
  modelMap: Map<string | symbol, AIModel>;
  workspaceMap: Map<string | symbol, WorkspaceClaims["claims"][number]>;
}) {
  const { group, itemGroups: agentGroups } = useAgentList();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentList",
  });

  return (
    <AgentListCardsContainer>
      {agentGroups.map(([groupId, agentGroups]) => (
        <Fragment key={toKey(groupId)}>
          {group === "favorite" ? (
            <div className="text-lg font-bold lg:col-span-2 xl:col-span-3">
              {groupId === NO_GROUP_KEY
                ? t("labelOtherAgents")
                : t("labelFavorites")}
            </div>
          ) : undefined}

          {group === "first-letter" ? (
            <div className="text-lg font-bold lg:col-span-2 xl:col-span-3">
              {String(groupId)}
            </div>
          ) : undefined}

          {group === "workspace" ? (
            <div className="text-lg font-bold lg:col-span-2 xl:col-span-3">
              {workspaceMap.get(groupId)?.name}{" "}
              <Tooltip>
                <TooltipTrigger className="cursor-help">
                  <UserRoleIcon
                    className="text-muted-foreground size-4"
                    role={workspaceMap.get(groupId)?.claim}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <UserRoleText role={workspaceMap.get(groupId)?.claim} />
                </TooltipContent>
              </Tooltip>
            </div>
          ) : undefined}

          {group === "model" ? (
            <div className="text-lg font-bold lg:col-span-2 xl:col-span-3">
              {groupId === NO_GROUP_KEY
                ? t("labelNoGroup")
                : (modelMap.get(groupId)?.name ??
                  t("labelUnknownModel", { id: String(groupId) }))}
            </div>
          ) : undefined}

          {group === "document-repository" ? (
            <div className="text-lg font-bold lg:col-span-2 xl:col-span-3">
              {groupId === NO_GROUP_KEY
                ? t("labelNoRepositories")
                : (documentRepositoryMap.get(groupId)?.name ??
                  t("labelUnknownRepository", { id: String(groupId) }))}
            </div>
          ) : undefined}

          {group === "role-count" ? (
            <div className="text-lg font-bold lg:col-span-2 xl:col-span-3">
              {t("labelRoleCount", { count: Number(groupId) })}
            </div>
          ) : undefined}

          {agentGroups.map((agent) => (
            <AgentCard
              agent={agent}
              documentRepositoryMap={documentRepositoryMap}
              favorites={favorites}
              key={`${toKey(groupId)}:${agent.id}`}
              model={modelMap.get(agent.modelIdentifier)}
              workspace={workspaceMap.get(agent.workspaceId)}
            />
          ))}
        </Fragment>
      ))}
    </AgentListCardsContainer>
  );
}
