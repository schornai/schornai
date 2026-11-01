"use client";

import {
  CardApp,
  CardAppContent,
  CardAppDescription,
  CardAppFooter,
  CardAppHeader,
  CardAppMain,
  CardAppName,
} from "@schornio/aibox-package-ui/components/card-app";
import { Library } from "lucide-react";
import Link from "next/link";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import type { WorkspaceClaim } from "../../../_models/getWorkspaceClaims";
import { WorkspaceIconGroupActions } from "./WorkspaceIconGroupActions";
import { WorkspaceIconGroupInfos } from "./WorkspaceIconGroupInfos";
import { useT } from "next-i18next/client";

export function WorkspaceCard({
  favorites,
  isAdminView,
  workspace,
}: {
  favorites?: SettingFavorites;
  isAdminView?: boolean;
  workspace?: WorkspaceClaim;
}) {
  const { t } = useT("workspace", { keyPrefix: "_components.WorkspaceCard" });

  return (
    <CardApp className="max-w-full">
      <CardAppHeader>
        <Library /> {t("labelType")}
      </CardAppHeader>
      <CardAppMain
        className="p-3"
        render={
          workspace ? <Link href={`/workspace/${workspace.id}`} /> : undefined
        }
      >
        <CardAppContent>
          <CardAppName>{workspace?.name}</CardAppName>
          <CardAppDescription>{workspace?.description}</CardAppDescription>
        </CardAppContent>
      </CardAppMain>
      {isAdminView ? undefined : (
        <CardAppFooter>
          <WorkspaceIconGroupInfos workspace={workspace} />
          <WorkspaceIconGroupActions
            favorites={favorites}
            workspace={workspace}
          />
        </CardAppFooter>
      )}
    </CardApp>
  );
}
