import { Star, StarX } from "lucide-react";
import { IconGroupButtonAction } from "@schornio/aibox-package-ui/components/icon-group";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import type { Automation } from "@schornio/aibox-package-database/automation/_types";
import { updateFavorite } from "../../../_actions/updateFavorite";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function AutomationFavorite({
  automation,
  favorites,
}: {
  automation?: Partial<Automation>;
  favorites?: SettingFavorites;
}) {
  const { t } = useT("automation");

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updateFavorite, actionUtils);

  const isFavorite = favorites?.favorites.some(
    ({ id, type }) => type === "automation" && id === automation?.id,
  );

  return (
    <IconGroupButtonAction
      disabled={!automation?.id}
      hasErrored={hasErrored}
      hasSucceeded={hasSucceeded}
      indicator="replace"
      isPending={isPending}
      onClick={() => {
        const newFavorites: SettingFavorites = favorites
          ? favorites
          : {
              favorites: [],
              showInSidebar: false,
              version: "favorites-v2",
            };

        if (isFavorite) {
          execute({
            ...newFavorites,
            favorites: newFavorites.favorites.filter(
              (fav) => fav.type !== "automation" || fav.id !== automation?.id,
            ),
          });
        } else if (automation?.id) {
          execute({
            ...newFavorites,
            favorites: [
              ...newFavorites.favorites,
              { id: automation.id, type: "automation" },
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
