"use client";
import Link from "next/link";
import { useT } from "next-i18next/client";
import type { AutomationDisplay } from "./AutomationNextRun";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import {
  CardApp,
  CardAppHeader,
  CardAppMain,
  CardAppContent,
  CardAppName,
  CardAppDescription,
  CardAppFooter,
} from "@schornio/aibox-package-ui/components/card-app";
import { CircleChevronsRight } from "@/lib/icons/circle-chevrons-right";
import { AutomationAvatar } from "./AutomationAvatar";
import { AutomationIconGroupActions } from "./AutomationIconGroupActions";
import { AutomationIconGroupInfos } from "./AutomationIconGroupInfos";
export function AutomationCard({
  automation,
  preview = false,
  favorites,
}: {
  automation: AutomationDisplay;
  preview?: boolean;
  favorites?: SettingFavorites;
}) {
  const { t } = useT("automation");
  return (
    <CardApp appColor={automation.color}>
      <CardAppHeader>
        <CircleChevronsRight />
        {t("labelAutomation")}
      </CardAppHeader>
      <CardAppMain
        render={
          automation.id && !preview ? (
            <Link href={`/app/automation/${automation.id}/info`} />
          ) : undefined
        }
      >
        <AutomationAvatar
          size="lg"
          className="m-3"
          icon={automation.icon}
          fallback={automation.name}
        />
        <CardAppContent>
          <CardAppName>{automation.name || t("labelNew")}</CardAppName>
          <CardAppDescription>{automation.description}</CardAppDescription>
        </CardAppContent>
      </CardAppMain>
      <CardAppFooter>
        <AutomationIconGroupInfos automation={automation} />
        {!preview && (
          <AutomationIconGroupActions
            automation={automation}
            favorites={favorites}
          />
        )}
      </CardAppFooter>
    </CardApp>
  );
}
