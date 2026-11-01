import { Star, StarX } from "lucide-react";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { IconGroupButtonAction } from "@schornio/aibox-package-ui/components/icon-group";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import { updateFavorite } from "../../_actions/updateFavorite";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function AgentIconGroupActionFavorite({
  agent,
  favorites,
}: {
  agent?: Partial<Agent>;
  favorites?: SettingFavorites;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentIconGroupActionFavorite",
  });

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updateFavorite, actionUtils);

  const isFavorite = favorites?.favorites.some(({ id }) => id === agent?.id);

  return (
    <IconGroupButtonAction
      disabled={!agent?.id}
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
              (fav) => fav.id !== agent?.id,
            ),
          });
        } else if (agent?.id) {
          execute({
            ...newFavorites,
            favorites: [
              ...newFavorites.favorites,
              { id: agent.id, type: "agent" },
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
