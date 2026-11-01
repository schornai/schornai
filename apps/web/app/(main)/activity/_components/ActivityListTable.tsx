"use client";

import { NO_GROUP_KEY, toKey } from "@/lib/groupSortView/hook";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@schornio/aibox-package-ui/components/table";
import type { Activity } from "@schornio/aibox-realtime/documents/activity/_types";
import { ActivityIconGroupActions } from "./ActivityIconGroupActions";
import { ActivityListEmpty } from "./ActivityListEmpty";
import { ActivityStateBadge } from "./ActivityStateBadge";
import { ActivityStateText } from "./ActivityStateText";
import { AvatarApp } from "@schornio/aibox-package-ui/components/avatar-app";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import { Fragment } from "react/jsx-runtime";
import Link from "next/link";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { getTypeLink } from "../../_utils/getTypeLink";
import { useActivityList } from "./ActivityListProvider";
import { useActivityTypeInfos } from "../../_components/ActivityContextProvider";
import { useT } from "next-i18next/client";

export function ActivityListTable() {
  const { t, i18n } = useT("activity", {
    keyPrefix: "_components.ActivityListTable",
  });
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  const { group, itemGroups } = useActivityList();
  const typeInfos = useActivityTypeInfos();

  return (
    <ContainerMain>
      <ContainerTable>
        <Table className={cn({ "block w-0": itemGroups.length > 0 })}>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tableColumnLabel")}</TableHead>
              <TableHead>{t("tableColumnType")}</TableHead>
              <TableHead>{t("tableColumnState")}</TableHead>
              <TableHead>{t("tableColumnCreated")}</TableHead>
              <TableHead>{t("tableColumnUpdated")}</TableHead>
              <TableHead>{t("tableColumnPinned")}</TableHead>
              <TableHead className="text-right">
                {t("tableColumnNameActions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <ActivityListEmpty />
                </TableCell>
              </TableRow>
            ) : undefined}
            {itemGroups.map(([groupId, itemGroup]) => (
              <Fragment key={toKey(groupId)}>
                {group === "created" || group === "updated" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={7}>
                      {groupId === "today" ? t("groupTimeToday") : undefined}
                      {groupId === "last7Days"
                        ? t("groupTimeLast7Days")
                        : undefined}
                      {groupId === "last30Days"
                        ? t("groupTimeLast30Days")
                        : undefined}
                      {groupId === NO_GROUP_KEY
                        ? t("groupTimeOther")
                        : undefined}
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {group === "pinned" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={7}>
                      {groupId === "pinned" ? t("groupPinned") : undefined}
                      {groupId === NO_GROUP_KEY
                        ? t("groupNotPinned")
                        : undefined}
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {group === "state" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={7}>
                      {groupId === NO_GROUP_KEY ? (
                        t("groupUnknown")
                      ) : (
                        <ActivityStateText
                          state={groupId as Activity["state"]}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {group === "type" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={7}>
                      {groupId === "chat" ? t("groupChat") : undefined}
                      {groupId === "transcription"
                        ? t("groupTranscription")
                        : undefined}
                      {groupId === "reindex" ? t("groupReindex") : undefined}
                      {groupId === NO_GROUP_KEY ? t("groupUnknown") : undefined}
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {itemGroup.map((activity) => (
                  <TableRow key={`${toKey(groupId)}:${activity.id}`}>
                    <TableCell className="align-middle">
                      <Link
                        className="inline-block max-w-sm truncate"
                        href={
                          activity.content?.type === "transcription"
                            ? `${getTypeLink(activity.content)}/${activity.id}/files`
                            : `${getTypeLink(activity.content)}/${activity.id}`
                        }
                      >
                        {activity.label}
                      </Link>
                    </TableCell>
                    <TableCell className="py-1">
                      {activity.content?.type === "chat" ? (
                        <ContainerStyled
                          appColor={
                            typeInfos.get(activity.content.chatbotId)?.color
                          }
                          className="flex w-fit items-center gap-1 rounded-full p-1 pr-3"
                          render={
                            <Link
                              href={`/agent/${activity.content.chatbotId}`}
                            />
                          }
                        >
                          <AvatarApp
                            icon={
                              typeInfos.get(activity.content.chatbotId)?.icon
                            }
                          />
                          {typeInfos.get(activity.content.chatbotId)?.name}
                        </ContainerStyled>
                      ) : undefined}

                      {activity.content?.type === "transcription" ? (
                        <ContainerStyled
                          appColor={
                            typeInfos.get(activity.content.transcriberId)?.color
                          }
                          className="flex w-fit items-center gap-1 rounded-full p-1 pr-3"
                          render={
                            <Link
                              href={`/agent/${activity.content.transcriberId}`}
                            />
                          }
                        >
                          <AvatarApp
                            icon={
                              typeInfos.get(activity.content.transcriberId)
                                ?.icon
                            }
                          />
                          {typeInfos.get(activity.content.transcriberId)?.name}
                        </ContainerStyled>
                      ) : undefined}

                      {activity.content?.type === "reindex" ? (
                        <>{t("labelReindex")}</>
                      ) : undefined}
                    </TableCell>
                    <TableCell>
                      <ActivityStateBadge state={activity.state} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {dateFormatter.format(new Date(activity.createdAtISO))}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {dateFormatter.format(new Date(activity.updatedAtISO))}
                    </TableCell>
                    <TableCell>
                      {activity.pinned ? (
                        <Badge variant="outline">{t("labelPinned")}</Badge>
                      ) : undefined}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <ActivityIconGroupActions activity={activity} />
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
