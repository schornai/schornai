"use client";

import { File, Info, Pencil } from "lucide-react";
import {
  IconGroup,
  IconGroupButton,
} from "@schornio/aibox-package-ui/components/icon-group";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { DocumentRepositoryIconGroupActionFavorite } from "./DocumentRepositoryIconGroupActionFavorite";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import type { WorkspaceClaim } from "../../../../_models/getWorkspaceClaims";
import { hasPermission } from "@/lib/hasPermission";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function DocumentRepositoryIconGroupActions({
  documentRepository,
  favorites,
  workspace,
}: {
  documentRepository?: Partial<DocumentRepository>;
  favorites?: SettingFavorites;
  workspace?: WorkspaceClaim;
}) {
  const router = useRouter();
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryIconGroupActions",
  });

  return (
    <IconGroup>
      {hasPermission({
        claim: workspace?.claim,
        permission: "workspace-admin",
      }) ? (
        <IconGroupButton
          disabled={!documentRepository?.id}
          onClick={() =>
            router.push(`/app/documents/${documentRepository?.id}/edit`)
          }
          tooltip={t("tooltipEdit")}
        >
          <Pencil />
        </IconGroupButton>
      ) : undefined}
      <IconGroupButton
        disabled={!documentRepository?.id}
        onClick={() =>
          router.push(`/app/documents/${documentRepository?.id}/info`)
        }
        tooltip={t("tooltipInfo")}
      >
        <Info />
      </IconGroupButton>
      <DocumentRepositoryIconGroupActionFavorite
        documentRepository={documentRepository}
        favorites={favorites}
      />
      <IconGroupButton
        disabled={!documentRepository?.id}
        onClick={() =>
          router.push(`/app/documents/${documentRepository?.id}/files`)
        }
        tooltip={"Hauptverzeichnis"}
      >
        <File />
      </IconGroupButton>
    </IconGroup>
  );
}
