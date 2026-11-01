"use client";

import {
  CardApp,
  CardAppAvatar,
  CardAppContent,
  CardAppDescription,
  CardAppFooter,
  CardAppHeader,
  CardAppMain,
  CardAppName,
} from "@schornio/aibox-package-ui/components/card-app";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { DocumentRepositoryIconGroupActions } from "./DocumentRepositoryIconGroupActions";
import { DocumentRepositoryIconGroupInfos } from "./DocumentRepositoryIconGroupInfos";
import { FolderOpen } from "lucide-react";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import type { WorkspaceClaim } from "../../../../_models/getWorkspaceClaims";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function DocumentRepositoryCard({
  documentRepository,
  embeddingModel,
  favorites,
  transcriber,
  workspace,
}: {
  documentRepository?: Partial<DocumentRepository>;
  embeddingModel?: AIModel;
  favorites?: SettingFavorites;
  transcriber?: Transcriber_new;
  workspace?: WorkspaceClaim;
}) {
  const router = useRouter();
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryCard",
  });

  return (
    <CardApp appColor={documentRepository?.color}>
      <CardAppHeader>
        <FolderOpen />
        {t("labelType")}
      </CardAppHeader>
      <CardAppMain
        render={
          documentRepository ? (
            <button
              onClick={() =>
                router.push(`/app/documents/${documentRepository.id}/files`)
              }
            />
          ) : undefined
        }
      >
        <CardAppAvatar
          fallback={documentRepository?.name}
          icon={documentRepository?.icon}
        />

        <CardAppContent>
          <CardAppName>{documentRepository?.name}</CardAppName>
          <CardAppDescription>
            {documentRepository?.description}
          </CardAppDescription>
        </CardAppContent>
      </CardAppMain>
      <CardAppFooter>
        <DocumentRepositoryIconGroupInfos
          documentRepository={documentRepository}
          embeddingModel={embeddingModel}
          transcriber={transcriber}
          workspace={workspace}
        />
        <DocumentRepositoryIconGroupActions
          documentRepository={documentRepository}
          favorites={favorites}
          workspace={workspace}
        />
      </CardAppFooter>
    </CardApp>
  );
}
