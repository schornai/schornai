"use client";

import { NO_GROUP_KEY, toKey } from "@/lib/groupSortView/hook";
import type { Activity } from "@schornio/aibox-realtime/documents/activity/_types";
import { ActivityIconGroupActions } from "./ActivityIconGroupActions";
import { ActivityListEmpty } from "./ActivityListEmpty";
import { ActivityStateText } from "./ActivityStateText";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { Fragment } from "react/jsx-runtime";
import Link from "next/link";
import { getTypeId } from "../../_utils/getTypeId";
import { getTypeLink } from "../../_utils/getTypeLink";
import { useActivityList } from "./ActivityListProvider";
import { useActivityTypeInfos } from "../../_components/ActivityContextProvider";
import { useT } from "next-i18next/client";

export function ActivityListList() {
  const { t, i18n } = useT("activity", {
    keyPrefix: "_components.ActivityListList",
  });
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  const { group, itemGroups } = useActivityList();
  const typeInfos = useActivityTypeInfos();

  return (
    <ContainerMain>
      <ul className="flex flex-col gap-1">
        {itemGroups.length === 0 ? (
          <li>
            <ActivityListEmpty />
          </li>
        ) : undefined}
        {itemGroups.map(([groupId, itemGroup]) => (
          <Fragment key={toKey(groupId)}>
            {group === "created" || group === "updated" ? (
              <li
                className="mt-3 px-4 py-1 text-lg font-medium"
                data-group={toKey(groupId)}
              >
                {groupId === "today" ? t("groupTimeToday") : undefined}
                {groupId === "last7Days" ? t("groupTimeLast7Days") : undefined}
                {groupId === "last30Days"
                  ? t("groupTimeLast30Days")
                  : undefined}
                {groupId === NO_GROUP_KEY ? t("groupTimeOther") : undefined}
              </li>
            ) : undefined}

            {group === "pinned" ? (
              <li
                className="mt-3 px-4 py-1 text-lg font-medium"
                data-group={toKey(groupId)}
              >
                {groupId === "pinned" ? t("groupPinned") : undefined}
                {groupId === NO_GROUP_KEY ? t("groupNotPinned") : undefined}
              </li>
            ) : undefined}

            {group === "state" ? (
              <li
                className="mt-3 px-4 py-1 text-lg font-medium"
                data-group={toKey(groupId)}
              >
                {groupId === NO_GROUP_KEY ? (
                  t("groupUnknown")
                ) : (
                  <ActivityStateText state={groupId as Activity["state"]} />
                )}
              </li>
            ) : undefined}

            {group === "type" ? (
              <li
                className="mt-3 px-4 py-1 text-lg font-medium"
                data-group={toKey(groupId)}
              >
                {groupId === "chat" ? t("groupChat") : undefined}
                {groupId === "transcription"
                  ? t("groupTranscription")
                  : undefined}
                {groupId === "reindex" ? t("groupReindex") : undefined}
                {groupId === NO_GROUP_KEY ? t("groupUnknown") : undefined}
              </li>
            ) : undefined}

            {itemGroup.map((activity) => (
              <li
                className="flex items-center gap-3"
                key={`${toKey(groupId)}:${activity.id}`}
              >
                <div className="relative h-7 flex-1">
                  <ContainerStyled
                    appColor={typeInfos.get(getTypeId(activity.content))?.color}
                    className="absolute inset-0 flex rounded-sm px-2 py-0.5"
                    render={
                      activity.content?.type === "reindex" ? undefined : (
                        <Link
                          href={
                            activity.content?.type === "transcription"
                              ? `${getTypeLink(activity.content)}/${activity.id}/files`
                              : `${getTypeLink(activity.content)}/${activity.id}`
                          }
                        />
                      )
                    }
                  >
                    <span className="truncate">
                      {activity.content?.type === "reindex"
                        ? t("labelReindex")
                        : activity.label}
                    </span>
                  </ContainerStyled>
                </div>

                <span className="text-muted-foreground ml-auto text-xs text-nowrap tabular-nums">
                  {dateFormatter.format(new Date(activity.updatedAtISO))}
                </span>

                <ActivityIconGroupActions activity={activity} />
              </li>
            ))}
          </Fragment>
        ))}
      </ul>
    </ContainerMain>
  );
}
