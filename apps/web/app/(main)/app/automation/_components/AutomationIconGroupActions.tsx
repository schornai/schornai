"use client";
import Link from "next/link";
import { History, Info, Pencil } from "lucide-react";
import { useT } from "next-i18next/client";
import {
  IconGroup,
  IconGroupButton,
} from "@schornio/aibox-package-ui/components/icon-group";
import type { AutomationInput } from "@schornio/aibox-package-database/automation/_schemas";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import { AutomationFavorite } from "./AutomationFavorite";
import { AutomationRun } from "./AutomationRun";

export function AutomationIconGroupActions({
  automation,
  favorites,
}: {
  automation: AutomationInput;
  favorites?: SettingFavorites;
}) {
  const { t } = useT("automation");
  if (!automation.id) return null;
  const saved = { ...automation, id: automation.id };
  return (
    <IconGroup>
      <IconGroupButton
        tooltip={t("labelEdit")}
        nativeButton={false}
        render={<Link href={`/app/automation/${automation.id}/edit`} />}
      >
        <Pencil />
      </IconGroupButton>
      <IconGroupButton
        tooltip={t("labelInfo")}
        nativeButton={false}
        render={<Link href={`/app/automation/${automation.id}/info`} />}
      >
        <Info />
      </IconGroupButton>
      <AutomationFavorite automation={saved} favorites={favorites} />
      <IconGroupButton
        tooltip={t("labelRuns")}
        nativeButton={false}
        render={<Link href={`/app/automation/${automation.id}/runs`} />}
      >
        <History />
      </IconGroupButton>
      <AutomationRun automation={saved} compact />
    </IconGroup>
  );
}
