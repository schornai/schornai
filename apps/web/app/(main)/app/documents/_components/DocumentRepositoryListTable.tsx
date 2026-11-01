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
import { AvatarApp } from "@schornio/aibox-package-ui/components/avatar-app";
import { BotMessageSquare } from "lucide-react";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import { DocumentRepositoryIconGroupActions } from "./DocumentRepositoryIconGroupActions";
import { DocumentRepositoryIconGroupInfos } from "./DocumentRepositoryIconGroupInfos";
import { Fragment } from "react/jsx-runtime";
import Link from "next/link";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import { UserRoleIcon } from "../../../../_components/UserRoleIcon";
import { UserRoleText } from "../../../../_components/UserRoleText";
import type { WorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import { useDocumentRepositoryList } from "./DocumentRepositoryListProvider";
import { useT } from "next-i18next/client";

export function DocumentRepositoryListTable({
  favorites,
  modelsMap,
  transcriberMap,
  workspaceMap,
}: {
  favorites?: SettingFavorites;
  modelsMap: Map<string | symbol, AIModel>;
  transcriberMap: Map<string | symbol, Transcriber_new>;
  workspaceMap: Map<string | symbol, WorkspaceClaims["claims"][number]>;
}) {
  const { group, itemGroups: documentRepositoryGroups } =
    useDocumentRepositoryList();
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryListTable",
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
            {documentRepositoryGroups.length === 0 ? (
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
            {documentRepositoryGroups.map(
              ([groupId, documentRepositoryGroup]) => (
                <Fragment key={toKey(groupId)}>
                  {group === "favorite" ? (
                    <TableRow>
                      <TableCell className="bg-muted font-medium" colSpan={3}>
                        {groupId === NO_GROUP_KEY
                          ? t("labelOtherDocumentRepositories")
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

                  {group === "embedding-model" ? (
                    <TableRow>
                      <TableCell className="bg-muted font-medium" colSpan={3}>
                        {modelsMap.get(groupId)?.name ??
                          "Kein Embedding Modell"}
                      </TableCell>
                    </TableRow>
                  ) : undefined}

                  {group === "transcriber" ? (
                    <TableRow>
                      <TableCell className="bg-muted font-medium" colSpan={3}>
                        {transcriberMap.get(groupId)?.name ??
                          "Kein Transkriptor"}
                      </TableCell>
                    </TableRow>
                  ) : undefined}

                  {documentRepositoryGroup.map((documentRepository) => (
                    <TableRow
                      key={`${toKey(groupId)}:${documentRepository.id}`}
                    >
                      <TableCell>
                        <Link
                          className="flex items-center gap-1"
                          href={`/app/documents/${documentRepository?.id}/files`}
                        >
                          <AvatarApp icon={documentRepository.icon} />
                          <ContainerStyled
                            appColor={documentRepository.color}
                            className="size-4 rounded-full"
                          />
                          {documentRepository.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <DocumentRepositoryIconGroupInfos
                          documentRepository={documentRepository}
                          workspace={workspaceMap.get(
                            documentRepository.workspaceId ?? "not_set",
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DocumentRepositoryIconGroupActions
                            favorites={favorites}
                            documentRepository={documentRepository}
                            workspace={workspaceMap.get(
                              documentRepository.workspaceId ?? "not_set",
                            )}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ),
            )}
          </TableBody>
        </Table>
      </ContainerTable>
    </ContainerMain>
  );
}
