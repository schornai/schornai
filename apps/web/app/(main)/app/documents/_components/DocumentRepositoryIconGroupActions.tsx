"use client";

import { File, Info, Pencil } from "lucide-react";
import {
  ResourceActions,
  ResourceActionButton,
  type ResourceActionDisplay,
} from "../../../_components/ResourceActions";
import type { ReactNode } from "react";
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
  display = "icons",
  packageActions,
  remove,
  workspace,
}: {
  documentRepository?: Partial<DocumentRepository>;
  display?: ResourceActionDisplay;
  packageActions?: ReactNode;
  remove?: ReactNode;
  favorites?: SettingFavorites;
  workspace?: WorkspaceClaim;
}) {
  const router = useRouter();
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryIconGroupActions",
  });

  return (
    <ResourceActions
      display={display}
      primary={
        <ResourceActionButton
          display={display}
          disabled={!documentRepository?.id}
          onClick={() =>
            router.push(`/app/documents/${documentRepository?.id}/files`)
          }
          label={t("tooltipFiles")}
        >
          <File />
        </ResourceActionButton>
      }
      favorite={
        <DocumentRepositoryIconGroupActionFavorite
          display={display}
          documentRepository={documentRepository}
          favorites={favorites}
        />
      }
      info={
        <ResourceActionButton
          display={display}
          disabled={!documentRepository?.id}
          onClick={() =>
            router.push(`/app/documents/${documentRepository?.id}/info`)
          }
          label={t("tooltipInfo")}
        >
          <Info />
        </ResourceActionButton>
      }
      edit={
        hasPermission({
          claim: workspace?.claim,
          permission: "workspace-admin",
        }) && (
          <ResourceActionButton
            display={display}
            disabled={!documentRepository?.id}
            onClick={() =>
              router.push(`/app/documents/${documentRepository?.id}/edit`)
            }
            label={t("tooltipEdit")}
          >
            <Pencil />
          </ResourceActionButton>
        )
      }
      packageActions={packageActions}
      remove={remove}
    />
  );
}
