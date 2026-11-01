import type { Activity } from "@schornio/aibox-realtime/documents/activity/_types";
import { useT } from "next-i18next/client";

export function ActivityStateText({ state }: { state: Activity["state"] }) {
  const { t } = useT("activity", {
    keyPrefix: "_components.ActivityStateBadge",
  });

  switch (state) {
    case "error":
      return <>{t("error")}</>;
    case "idle":
      return <>{t("idle")}</>;
    case "running":
      return <>{t("running")}</>;
    case "success":
      return <>{t("success")}</>;
  }
}
