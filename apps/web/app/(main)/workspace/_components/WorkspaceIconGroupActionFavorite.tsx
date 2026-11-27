"use client";

import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import type { Workspace } from "@schornio/aibox-package-database/workspace/_types";
import { useT } from "next-i18next/client";

import {
  ResourceFavorite,
  type ResourceActionDisplay,
} from "../../_components/ResourceActions";

export function WorkspaceIconGroupActionFavorite({
  favorites,
  display,
  workspace,
}: {
  display?: ResourceActionDisplay;
  favorites?: SettingFavorites;
  workspace?: Workspace;
}) {
  const { t } = useT("workspace", {
    keyPrefix: "_components.WorkspaceIconGroupActionFavorite",
  });

  return (
    <ResourceFavorite
      display={display}
      type="workspace"
      id={workspace?.id}
      favorites={favorites}
      addLabel={t("tooltipAddFavorite")}
      removeLabel={t("tooltipRemoveFavorite")}
    />
  );
}
