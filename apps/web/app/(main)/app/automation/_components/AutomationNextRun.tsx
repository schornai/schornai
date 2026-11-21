"use client";

import { useEffect, useState } from "react";
import { useT } from "next-i18next/client";
import {
  automationScheduleSchema,
  type AutomationInput,
} from "@schornio/aibox-package-database/automation/_schemas";
import type { Automation } from "@schornio/aibox-package-database/automation/_types";
import { nextAutomationTime } from "@schornio/aibox-package-database/automation/nextAutomationTime";

export type AutomationDisplay = AutomationInput &
  Partial<Pick<Automation, "nextRunAt">>;

export function AutomationNextRun({
  automation,
  showLabel = false,
  showTimezone = true,
}: {
  automation: Pick<AutomationDisplay, "enabled" | "trigger" | "nextRunAt">;
  showLabel?: boolean;
  showTimezone?: boolean;
}) {
  const { t, i18n } = useT("automation");
  const { enabled, trigger, nextRunAt } = automation;
  const preview = enabled && trigger.type === "time" && nextRunAt === undefined;
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    if (!preview) return;
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [preview]);
  const parsed =
    trigger.type === "time"
      ? automationScheduleSchema.safeParse(trigger.schedule)
      : null;
  const next =
    enabled && now && parsed?.success
      ? nextRunAt !== undefined
        ? nextRunAt
          ? new Date(nextRunAt)
          : null
        : nextAutomationTime(parsed.data, now)
      : null;
  const formatter = new Intl.DateTimeFormat(
    i18n.resolvedLanguage ?? i18n.language ?? "de",
    { dateStyle: "medium", timeStyle: "short" },
  );
  return (
    <span role="status">
      {showLabel && <>{t("labelNextRun")}: </>}
      <span>
        {!enabled ? (
          t("labelPaused")
        ) : trigger.type === "storage" ? (
          t("labelOnFileEvent")
        ) : !now ? (
          "—"
        ) : !parsed?.success ? (
          t("labelCompleteSchedule")
        ) : next ? (
          <time className="tabular-nums" dateTime={next.toISOString()}>
            {formatter.format(next)}
          </time>
        ) : (
          t("labelNoNextRun")
        )}
      </span>
      {enabled && next && (
        <span>
          {" "}
          {showTimezone ? ` · ${formatter.resolvedOptions().timeZone}` : ""}
          {preview ? ` · ${t("labelAfterSave")}` : ""}
        </span>
      )}
    </span>
  );
}
