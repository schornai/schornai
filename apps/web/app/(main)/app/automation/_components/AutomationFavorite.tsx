import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import type { Automation } from "@schornio/aibox-package-database/automation/_types";
import { useT } from "next-i18next/client";

import {
  ResourceFavorite,
  type ResourceActionDisplay,
} from "../../../_components/ResourceActions";

export function AutomationFavorite({
  automation,
  favorites,
  display,
}: {
  automation?: Partial<Automation>;
  display?: ResourceActionDisplay;
  favorites?: SettingFavorites;
}) {
  const { t } = useT("automation");

  return (
    <ResourceFavorite
      display={display}
      type="automation"
      id={automation?.id}
      favorites={favorites}
      addLabel={t("tooltipAddFavorite")}
      removeLabel={t("tooltipRemoveFavorite")}
    />
  );
}
