import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import { useT } from "next-i18next/client";

import {
  ResourceFavorite,
  type ResourceActionDisplay,
} from "../../_components/ResourceActions";

export function AgentIconGroupActionFavorite({
  agent,
  favorites,
  display,
}: {
  agent?: Partial<Agent>;
  display?: ResourceActionDisplay;
  favorites?: SettingFavorites;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentIconGroupActionFavorite",
  });

  return (
    <ResourceFavorite
      display={display}
      type="agent"
      id={agent?.id}
      favorites={favorites}
      addLabel={t("tooltipAddFavorite")}
      removeLabel={t("tooltipRemoveFavorite")}
    />
  );
}
