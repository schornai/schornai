import {
  HeaderMain,
  HeaderMainAsideContent,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { Library } from "lucide-react";
import { WorkspaceList } from "./_components/WorkspaceList";
import { WorkspaceListOptionsDropdown } from "./_components/WorkspaceListOptionsDropdown";
import { WorkspaceListProvider } from "./_components/WorkspaceListProvider";
import { getCurrentUserConfigFavorites } from "../../_models/currentUserConfigFavorites";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { getT } from "next-i18next/server";
import { getWorkspaceClaims } from "../../_models/getWorkspaceClaims";
import { hasPermission } from "@/lib/hasPermission";

export default async function Page() {
  const [{ claims }, favorites, userPreferences, { t }] = await Promise.all([
    getWorkspaceClaims(),
    getCurrentUserConfigFavorites(),
    getGroupSortViewPreferences("/workspace"),
    getT("workspace", { keyPrefix: "page" }),
  ]);
  const favoriteIds = new Set(
    favorites.favorites
      .filter((item) => item.type === "workspace")
      .map((item) => item.id),
  );
  const workspaces = claims
    .filter((workspace) =>
      hasPermission({ claim: workspace.claim, permission: "user" }),
    )
    .map((workspace) => ({
      ...workspace,
      favorite: favoriteIds.has(workspace.id),
    }));

  return (
    <WorkspaceListProvider
      id="/workspace"
      workspaces={workspaces}
      userPreferences={userPreferences}
    >
      <HeaderMain>
        <HeaderMainContent>
          <Library /> {t("labelTitle")}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <WorkspaceListOptionsDropdown />
        </HeaderMainAsideContent>
      </HeaderMain>
      <WorkspaceList favorites={favorites} />
    </WorkspaceListProvider>
  );
}
