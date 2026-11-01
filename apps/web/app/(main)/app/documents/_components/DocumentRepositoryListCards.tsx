"use client";

import { NO_GROUP_KEY, toKey } from "@/lib/groupSortView/hook";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { DocumentRepositoryCard } from "./DocumentRepositoryCard";
import { DocumentRepositoryListCardsContainer } from "./DocumentRepositoryListCardsContainer";
import { Fragment } from "react/jsx-runtime";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import { UserRoleIcon } from "../../../../_components/UserRoleIcon";
import { UserRoleText } from "../../../../_components/UserRoleText";
import type { WorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import { useDocumentRepositoryList } from "./DocumentRepositoryListProvider";
import { useT } from "next-i18next/client";

export function DocumentRepositoryListCards({
  favorites,
  modelsMap,
  transcriberMap,
  workspaceMap,
}: {
  favorites: SettingFavorites;
  modelsMap: Map<string | symbol, AIModel>;
  transcriberMap: Map<string | symbol, Transcriber_new>;
  workspaceMap: Map<string | symbol, WorkspaceClaims["claims"][number]>;
}) {
  const { group, itemGroups: documentRepositoryGroups } =
    useDocumentRepositoryList();
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryListCards",
  });

  return (
    <DocumentRepositoryListCardsContainer>
      {documentRepositoryGroups.map(([groupId, documentRepositoryGroups]) => (
        <Fragment key={toKey(groupId)}>
          {group === "favorite" ? (
            <div className="text-lg font-bold lg:col-span-2 xl:col-span-3">
              {groupId === NO_GROUP_KEY
                ? t("labelOtherDocumentRepositories")
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

          {group === "embedding-model" ? (
            <div className="text-lg font-bold lg:col-span-2 xl:col-span-3">
              {modelsMap.get(groupId)?.name ?? "Kein Embedding Modell"}
            </div>
          ) : undefined}

          {group === "transcriber" ? (
            <div className="text-lg font-bold lg:col-span-2 xl:col-span-3">
              {transcriberMap.get(groupId)?.name ?? "Kein Transkriptor"}
            </div>
          ) : undefined}

          {documentRepositoryGroups.map((documentRepository) => (
            <DocumentRepositoryCard
              documentRepository={documentRepository}
              favorites={favorites}
              embeddingModel={modelsMap.get(
                documentRepository.index?.embedding?.modelIdentifier ?? "",
              )}
              key={`${toKey(groupId)}:${documentRepository.id}`}
              transcriber={transcriberMap.get(
                documentRepository.transcriberIdentifier ?? "",
              )}
              workspace={workspaceMap.get(
                documentRepository.workspaceId ?? "not_set",
              )}
            />
          ))}
        </Fragment>
      ))}
    </DocumentRepositoryListCardsContainer>
  );
}
