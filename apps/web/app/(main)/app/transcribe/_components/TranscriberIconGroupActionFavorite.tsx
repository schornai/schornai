import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import { useT } from "next-i18next/client";

import {
  ResourceFavorite,
  type ResourceActionDisplay,
} from "../../../_components/ResourceActions";

export function TranscriberIconGroupActionFavorite({
  transcriber,
  favorites,
  display,
}: {
  transcriber?: Partial<Transcriber_new>;
  display?: ResourceActionDisplay;
  favorites?: SettingFavorites;
}) {
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberIconGroupActionFavorite",
  });

  return (
    <ResourceFavorite
      display={display}
      type="transcriber"
      id={transcriber?.id}
      favorites={favorites}
      addLabel={t("tooltipAddFavorite")}
      removeLabel={t("tooltipRemoveFavorite")}
    />
  );
}
