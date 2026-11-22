import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import { useT } from "next-i18next/client";

import {
  ResourceFavorite,
  type ResourceActionDisplay,
} from "../../../_components/ResourceActions";

export function DocumentRepositoryIconGroupActionFavorite({
  documentRepository,
  favorites,
  display,
}: {
  documentRepository?: Partial<DocumentRepository>;
  display?: ResourceActionDisplay;
  favorites?: SettingFavorites;
}) {
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryIconGroupActionFavorite",
  });

  return (
    <ResourceFavorite
      display={display}
      type="documentRepository"
      id={documentRepository?.id}
      favorites={favorites}
      addLabel={t("tooltipAddFavorite")}
      removeLabel={t("tooltipRemoveFavorite")}
    />
  );
}
