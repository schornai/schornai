import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  SidebarFavoriteItemAgent,
  SidebarFavoriteItemDocumentRepository,
  SidebarFavoriteItemTranscriber,
  SidebarFavoriteItemWorkspace,
} from "./SidebarFavoriteItem";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarMenu,
} from "@schornio/aibox-package-ui/components/sidebar";
import { Fragment } from "react/jsx-runtime";
import { getCurrentUserConfigFavorites } from "../../_models/currentUserConfigFavorites";
import { getT } from "next-i18next/server";
import { getWorkspaceClaims } from "../../_models/getWorkspaceClaims";
import { hasPermission } from "@/lib/hasPermission";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export async function SidebarFavorites() {
  const [
    { agents, documentRepositories, favorites, transcribers, showInSidebar },
    { t },
    { claims },
  ] = await Promise.all([
    getCurrentUserConfigFavorites(),
    getT("common", { keyPrefix: "main._components.SidebarFavorites" }),
    getWorkspaceClaims(),
  ]);

  if (!showInSidebar) {
    return null;
  }

  const workspaceMap = new Map(
    claims
      .filter((workspace) =>
        hasPermission({ claim: workspace.claim, permission: "user" }),
      )
      .map((workspace) => [workspace.id, workspace]),
  );

  const agentsMap = new Map(agents?.map((agent) => [agent.id, agent]));
  const transcribersMap = new Map(
    transcribers?.map((transcriber) => [transcriber.id, transcriber]),
  );
  const documentRepositoriesMap = new Map(
    documentRepositories?.map((documentRepository) => [
      documentRepository.id,
      documentRepository,
    ]),
  );

  return (
    <SidebarGroup
      className={cn(
        !favorites?.length && "group-data-[collapsible=icon]:hidden",
      )}
    >
      <SidebarGroupLabel>{t("label")}</SidebarGroupLabel>
      <SidebarGroupAction
        className="text-sidebar-foreground/70 hover:text-sidebar-foreground [&>svg]:size-3"
        render={<Link href="/me/favorites" />}
        aria-label={t("labelEdit")}
        title={t("labelEdit")}
      >
        <Pencil />
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {(favorites?.length ?? 0) === 0 ? (
            <div className="text-muted-foreground bg-muted rounded-md p-4 text-center text-xs">
              {t("empty")}
            </div>
          ) : undefined}
          {favorites?.map((favorite) => (
            <Fragment key={`${favorite.type}:${favorite.id}`}>
              {favorite.type === "workspace" ? (
                <SidebarFavoriteItemWorkspace
                  workspace={workspaceMap.get(favorite.id)}
                />
              ) : undefined}
              {favorite.type === "agent" ? (
                <SidebarFavoriteItemAgent agent={agentsMap.get(favorite.id)} />
              ) : undefined}
              {favorite.type === "transcriber" ? (
                <SidebarFavoriteItemTranscriber
                  transcriber={transcribersMap.get(favorite.id)}
                />
              ) : undefined}
              {favorite.type === "documentRepository" ? (
                <SidebarFavoriteItemDocumentRepository
                  documentRepository={documentRepositoriesMap.get(favorite.id)}
                />
              ) : undefined}
            </Fragment>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
