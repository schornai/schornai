"use client";

import {
  ResourceActions,
  ResourceActionButton,
  type ResourceActionDisplay,
} from "../../_components/ResourceActions";
import { Info, Pencil } from "lucide-react";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import type { WorkspaceClaim } from "../../../_models/getWorkspaceClaims";
import { WorkspaceIconGroupActionFavorite } from "./WorkspaceIconGroupActionFavorite";
import { hasPermission } from "@/lib/hasPermission";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function WorkspaceIconGroupActions({
  favorites,
  display = "icons",
  workspace,
}: {
  display?: ResourceActionDisplay;
  favorites?: SettingFavorites;
  workspace?: WorkspaceClaim;
}) {
  const router = useRouter();
  const { t } = useT("workspace", {
    keyPrefix: "_components.WorkspaceIconGroupActions",
  });

  return (
    <ResourceActions
      display={display}
      favorite={
        <WorkspaceIconGroupActionFavorite
          display={display}
          workspace={workspace}
          favorites={favorites}
        />
      }
      info={
        <ResourceActionButton
          display={display}
          disabled={!workspace?.id}
          onClick={() => router.push(`/workspace/${workspace?.id}`)}
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
            disabled={!workspace?.id}
            onClick={() => router.push(`/settings/workspace/${workspace?.id}`)}
            label={t("tooltipEdit")}
          >
            <Pencil />
          </ResourceActionButton>
        )
      }
    />
  );
}
