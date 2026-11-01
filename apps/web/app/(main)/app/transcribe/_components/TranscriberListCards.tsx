"use client";

import { NO_GROUP_KEY, toKey } from "@/lib/groupSortView/hook";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { Fragment } from "react/jsx-runtime";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import { TranscriberCard } from "./TranscriberCard";
import { TranscriberListCardsContainer } from "./TranscriberListCardsContainer";
import { UserRoleIcon } from "../../../../_components/UserRoleIcon";
import { UserRoleText } from "../../../../_components/UserRoleText";
import type { WorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import { useT } from "next-i18next/client";
import { useTranscriberList } from "./TranscriberListProvider";

export function TranscriberListCards({
  favorites,
  modelMap,
  workspaceMap,
}: {
  favorites: SettingFavorites;
  modelMap: Map<string | symbol, AIModel>;
  workspaceMap: Map<string | symbol, WorkspaceClaims["claims"][number]>;
}) {
  const { group, itemGroups: transcriberGroups } = useTranscriberList();
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberListCards",
  });

  return (
    <TranscriberListCardsContainer>
      {transcriberGroups.map(([groupId, transcriberGroups]) => (
        <Fragment key={toKey(groupId)}>
          {group === "favorite" ? (
            <div className="text-lg font-bold lg:col-span-2 xl:col-span-3">
              {groupId === NO_GROUP_KEY
                ? t("labelOtherTranscribers")
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

          {transcriberGroups.map((transcriber) => (
            <TranscriberCard
              favorites={favorites}
              key={`${toKey(groupId)}:${transcriber.id}`}
              model={modelMap.get(transcriber.modelIdentifier ?? "not_set")}
              transcriber={transcriber}
              workspace={workspaceMap.get(transcriber.workspaceId)}
            />
          ))}
        </Fragment>
      ))}
    </TranscriberListCardsContainer>
  );
}
