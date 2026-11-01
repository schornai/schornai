import { Star, StarX } from "lucide-react";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { IconGroupButtonAction } from "@schornio/aibox-package-ui/components/icon-group";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import { updateFavorite } from "../../../_actions/updateFavorite";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function DocumentRepositoryIconGroupActionFavorite({
  documentRepository,
  favorites,
}: {
  documentRepository?: Partial<DocumentRepository>;
  favorites?: SettingFavorites;
}) {
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryIconGroupActionFavorite",
  });

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updateFavorite, actionUtils);

  const isFavorite = favorites?.favorites.some(
    ({ id }) => id === documentRepository?.id,
  );

  return (
    <IconGroupButtonAction
      disabled={!documentRepository?.id}
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
              (fav) => fav.id !== documentRepository?.id,
            ),
          });
        } else if (documentRepository?.id) {
          execute({
            ...newFavorites,
            favorites: [
              ...newFavorites.favorites,
              { id: documentRepository.id, type: "documentRepository" },
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
