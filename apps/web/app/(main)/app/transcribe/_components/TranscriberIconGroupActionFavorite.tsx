import { Star, StarX } from "lucide-react";
import { IconGroupButtonAction } from "@schornio/aibox-package-ui/components/icon-group";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import { updateFavorite } from "../../../_actions/updateFavorite";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function TranscriberIconGroupActionFavorite({
  transcriber,
  favorites,
}: {
  transcriber?: Partial<Transcriber_new>;
  favorites?: SettingFavorites;
}) {
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberIconGroupActionFavorite",
  });

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updateFavorite, actionUtils);

  const isFavorite = favorites?.favorites.some(
    ({ id }) => id === transcriber?.id,
  );

  return (
    <IconGroupButtonAction
      disabled={!transcriber?.id}
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
              (fav) => fav.id !== transcriber?.id,
            ),
          });
        } else if (transcriber?.id) {
          execute({
            ...newFavorites,
            favorites: [
              ...newFavorites.favorites,
              { id: transcriber.id, type: "transcriber" },
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
