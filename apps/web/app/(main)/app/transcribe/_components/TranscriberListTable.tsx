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
import { Fragment } from "react/jsx-runtime";
import Link from "next/link";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import { TranscriberIconGroupActions } from "./TranscriberIconGroupActions";
import { TranscriberIconGroupInfos } from "./TranscriberIconGroupInfos";
import { UserRoleIcon } from "../../../../_components/UserRoleIcon";
import { UserRoleText } from "../../../../_components/UserRoleText";
import type { WorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import { useT } from "next-i18next/client";
import { useTranscriberList } from "./TranscriberListProvider";

export function TranscriberListTable({
  favorites,
  modelMap,
  workspaceMap,
}: {
  favorites?: SettingFavorites;
  modelMap: Map<string | symbol, AIModel>;
  workspaceMap: Map<string | symbol, WorkspaceClaims["claims"][number]>;
}) {
  const { group, itemGroups: transcriberGroups } = useTranscriberList();
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberListTable",
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
            {transcriberGroups.length === 0 ? (
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
            {transcriberGroups.map(([groupId, transcriberGroup]) => (
              <Fragment key={toKey(groupId)}>
                {group === "favorite" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={3}>
                      {groupId === NO_GROUP_KEY
                        ? t("labelOtherTranscribers")
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

                {transcriberGroup.map((transcriber) => (
                  <TableRow key={`${toKey(groupId)}:${transcriber.id}`}>
                    <TableCell>
                      <Link
                        className="flex items-center gap-1"
                        href={`/app/transcribe/${transcriber?.id}`}
                      >
                        <AvatarApp icon={transcriber.icon} />
                        <ContainerStyled
                          appColor={transcriber.color}
                          className="size-4 rounded-full"
                        />
                        {transcriber.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <TranscriberIconGroupInfos
                        model={modelMap.get(
                          transcriber.modelIdentifier ?? "not_set",
                        )}
                        workspace={workspaceMap.get(transcriber.workspaceId)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <TranscriberIconGroupActions
                          favorites={favorites}
                          transcriber={transcriber}
                          workspace={workspaceMap.get(transcriber.workspaceId)}
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
