"use client";

import { History, Info, Pencil } from "lucide-react";
import { useT } from "next-i18next/client";
import {
  ResourceActions,
  ResourceActionButton,
  type ResourceActionDisplay,
} from "../../../_components/ResourceActions";
import type { ReactNode } from "react";
import type { AutomationInput } from "@schornio/aibox-package-database/automation/_schemas";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import { AutomationFavorite } from "./AutomationFavorite";
import { AutomationRun } from "./AutomationRun";

export function AutomationIconGroupActions({
  automation,
  favorites,
  display = "icons",
  packageActions,
  remove,
}: {
  automation: AutomationInput;
  display?: ResourceActionDisplay;
  packageActions?: ReactNode;
  remove?: ReactNode;
  favorites?: SettingFavorites;
}) {
  const { t } = useT("automation");
  if (!automation.id) return null;
  const saved = { ...automation, id: automation.id };
  const runs = (
    <ResourceActionButton
      display={display}
      label={t("labelRuns")}
      href={`/app/automation/${automation.id}/runs`}
    >
      <History />
    </ResourceActionButton>
  );
  return (
    <ResourceActions
      display={display}
      primary={
        <>
          {display === "icons" && runs}
          <AutomationRun
            className={display === "buttons" ? "w-full" : undefined}
            automation={saved}
            compact={display === "icons"}
            menu={display === "menu"}
          />
          {display === "menu" && runs}
        </>
      }
      favorite={
        <AutomationFavorite
          display={display}
          automation={saved}
          favorites={favorites}
        />
      }
      info={
        <ResourceActionButton
          display={display}
          label={t("labelInfo")}
          href={`/app/automation/${automation.id}/info`}
        >
          <Info />
        </ResourceActionButton>
      }
      edit={
        <ResourceActionButton
          display={display}
          label={t("labelEdit")}
          href={`/app/automation/${automation.id}/edit`}
        >
          <Pencil />
        </ResourceActionButton>
      }
      packageActions={packageActions}
      remove={remove}
    />
  );
}
