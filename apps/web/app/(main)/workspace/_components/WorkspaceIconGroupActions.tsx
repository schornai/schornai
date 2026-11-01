"use client";

import {
  IconGroup,
  IconGroupButton,
} from "@schornio/aibox-package-ui/components/icon-group";
import { Info, Pencil } from "lucide-react";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import type { WorkspaceClaim } from "../../../_models/getWorkspaceClaims";
import { WorkspaceIconGroupActionFavorite } from "./WorkspaceIconGroupActionFavorite";
import { hasPermission } from "@/lib/hasPermission";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function WorkspaceIconGroupActions({
  favorites,
  workspace,
}: {
  favorites?: SettingFavorites;
  workspace?: WorkspaceClaim;
}) {
  const router = useRouter();
  const { t } = useT("workspace", {
    keyPrefix: "_components.WorkspaceIconGroupActions",
  });

  return (
    <IconGroup>
      {hasPermission({
        claim: workspace?.claim,
        permission: "workspace-admin",
      }) ? (
        <IconGroupButton
          disabled={!workspace?.id}
          onClick={() => router.push(`/settings/workspace/${workspace?.id}`)}
          tooltip={t("tooltipEdit")}
        >
          <Pencil />
        </IconGroupButton>
      ) : undefined}
      <IconGroupButton
        disabled={!workspace?.id}
        onClick={() => router.push(`/workspace/${workspace?.id}`)}
        tooltip={t("tooltipInfo")}
      >
        <Info />
      </IconGroupButton>
      <WorkspaceIconGroupActionFavorite
        workspace={workspace}
        favorites={favorites}
      />
    </IconGroup>
  );
}
