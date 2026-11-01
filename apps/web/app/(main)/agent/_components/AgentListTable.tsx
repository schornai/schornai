"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { NO_GROUP_KEY, toKey } from "@/lib/groupSortView/hook";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@schornio/aibox-package-ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { AgentIconGroupActions } from "./AgentIconGroupActions";
import { AgentIconGroupInfos } from "./AgentIconGroupInfos";
import { AvatarApp } from "@schornio/aibox-package-ui/components/avatar-app";
import { BotMessageSquare } from "lucide-react";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { Fragment } from "react/jsx-runtime";
import Link from "next/link";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import { UserRoleIcon } from "../../../_components/UserRoleIcon";
import { UserRoleText } from "../../../_components/UserRoleText";
import type { WorkspaceClaims } from "../../../_models/getWorkspaceClaims";
import { useAgentList } from "./AgentListProvider";
import { useT } from "next-i18next/client";

export function AgentListTable({
  documentRepositoryMap,
  favorites,
  modelMap,
  workspaceMap,
}: {
  documentRepositoryMap: Map<string | symbol, DocumentRepository>;
  favorites?: SettingFavorites;
  modelMap: Map<string | symbol, AIModel>;
  workspaceMap: Map<string | symbol, WorkspaceClaims["claims"][number]>;
}) {
  const { group, itemGroups: agentGroups } = useAgentList();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentList",
  });

  return (
    <ContainerMain>
      <ContainerTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tableColumnName")}</TableHead>
              <TableHead>{t("tableColumnCapablilities")}</TableHead>
              <TableHead className="text-right">
                {t("tableColumnNameActions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <BotMessageSquare />
                      </EmptyMedia>
                      <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
                      <EmptyDescription>
                        {t("emptyDescription")}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : undefined}
            {agentGroups.map(([groupId, agentGroups]) => (
              <Fragment key={toKey(groupId)}>
                {group === "favorite" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={3}>
                      {groupId === NO_GROUP_KEY
                        ? t("labelOtherAgents")
                        : t("labelFavorites")}
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {group === "first-letter" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={3}>
                      {String(groupId)}
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {group === "workspace" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={3}>
                      <div className="flex gap-1">
                        {workspaceMap.get(groupId)?.name}{" "}
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            <UserRoleIcon
                              className="text-muted-foreground size-4"
                              role={workspaceMap.get(groupId)?.claim}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <UserRoleText
                              role={workspaceMap.get(groupId)?.claim}
                            />
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {group === "model" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={3}>
                      {groupId === NO_GROUP_KEY
                        ? t("labelNoGroup")
                        : (modelMap.get(groupId)?.name ??
                          t("labelUnknownModel", { id: String(groupId) }))}
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {group === "document-repository" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={3}>
                      {groupId === NO_GROUP_KEY
                        ? t("labelNoRepositories")
                        : (documentRepositoryMap.get(groupId)?.name ??
                          t("labelUnknownRepository", {
                            id: String(groupId),
                          }))}
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {group === "role-count" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={3}>
                      {t("labelRoleCount", { count: Number(groupId) })}
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {agentGroups.map((agent) => (
                  <TableRow key={`${toKey(groupId)}:${agent.id}`}>
                    <TableCell>
                      <Link
                        className="flex items-center gap-1"
                        href={`/agent/${agent?.id}`}
                      >
                        <AvatarApp icon={agent.icon} />
                        <ContainerStyled
                          appColor={agent.color}
                          className="size-4 rounded-full"
                        />
                        {agent.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <AgentIconGroupInfos
                        agent={agent}
                        documentRepositoryMap={documentRepositoryMap}
                        model={modelMap.get(agent.modelIdentifier)}
                        workspace={workspaceMap.get(agent.workspaceId)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <AgentIconGroupActions
                          agent={agent}
                          favorites={favorites}
                          workspace={workspaceMap.get(agent.workspaceId)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </ContainerTable>
    </ContainerMain>
  );
}
