"use client";
import { Clock, Files, Power, Pause } from "lucide-react";
import { useT } from "next-i18next/client";
import {
  IconGroup,
  IconGroupInfo,
} from "@schornio/aibox-package-ui/components/icon-group";
import { AutomationNextRun, type AutomationDisplay } from "./AutomationNextRun";
export function AutomationIconGroupInfos({
  automation,
}: {
  automation: AutomationDisplay;
}) {
  const { t } = useT("automation");
  return (
    <IconGroup>
      <IconGroupInfo
        tooltip={t(automation.enabled ? "labelEnabled" : "labelPaused")}
      >
        {automation.enabled ? <Power /> : <Pause />}
      </IconGroupInfo>
      <IconGroupInfo
        aria-label={t(`options.${automation.trigger.type}`)}
        tooltip={
          automation.trigger.type === "time" ? (
            <AutomationNextRun automation={automation} showLabel />
          ) : (
            t("options.storage")
          )
        }
      >
        {automation.trigger.type === "time" ? <Clock /> : <Files />}
      </IconGroupInfo>
    </IconGroup>
  );
}
