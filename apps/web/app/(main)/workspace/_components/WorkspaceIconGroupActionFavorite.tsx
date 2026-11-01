"use client";

import { Star, StarX } from "lucide-react";
import { IconGroupButtonAction } from "@schornio/aibox-package-ui/components/icon-group";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import type { Workspace } from "@schornio/aibox-package-database/workspace/_types";
import { updateFavorite } from "../../_actions/updateFavorite";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function WorkspaceIconGroupActionFavorite({
  favorites,
  workspace,
}: {
  favorites?: SettingFavorites;
  workspace?: Workspace;
}) {
  const { t } = useT("workspace", {
    keyPrefix: "_components.WorkspaceIconGroupActionFavorite",
  });

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updateFavorite, actionUtils);

  const isFavorite = favorites?.favorites.some(
    ({ id, type }) => type === "workspace" && id === workspace?.id,
  );

  return (
    <IconGroupButtonAction
      disabled={!workspace?.id}
      hasErrored={hasErrored}
      hasSucceeded={hasSucceeded}
      indicator="replace"
      isPending={isPending}
      onClick={() => {
        const newFavorites: SettingFavorites = favorites
          ? favorites
          : {
              favorites: [],
              showInSidebar: true,
              version: "favorites-v2",
            };

        if (isFavorite) {
          execute({
            ...newFavorites,
            favorites: newFavorites.favorites.filter(
              (fav) => fav.type !== "workspace" || fav.id !== workspace?.id,
            ),
          });
        } else if (workspace?.id) {
          execute({
            ...newFavorites,
            favorites: [
              ...newFavorites.favorites,
              { id: workspace.id, type: "workspace" },
            ],
          });
        }
      }}
      tooltip={
        isFavorite ? t("tooltipRemoveFavorite") : t("tooltipAddFavorite")
      }
    >
      {isFavorite ? <StarX /> : <Star />}
    </IconGroupButtonAction>
  );
}
