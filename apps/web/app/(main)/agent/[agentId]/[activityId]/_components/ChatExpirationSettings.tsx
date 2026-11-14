"use client";

import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { ClockFading } from "lucide-react";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import type { ChatExpiration } from "@schornio/aibox-package-database/chat/expirationSchema";
import { setChatExpiration } from "../_actions/setChatExpiration";

export function ChatExpirationSettings({
  agentId,
  activityId,
  expiration,
}: {
  agentId: string;
  activityId: string;
  expiration: ChatExpiration;
}) {
  const { t, i18n } = useT("agent", {
    keyPrefix: "_components.ChatExpirationSettings",
  });
  const save = useAction(setChatExpiration);
  const enabled = expiration.expiresAt !== null;
  const deadline = expiration.expiresAt
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(expiration.expiresAt))
    : null;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <ButtonAction
            type="button"
            indicator="replace"
            variant="ghost"
            className={cn({
              "bg-primary/10 text-primary dark:bg-primary/80 dark:hover:bg-primary/50 hover:bg-primary/20 px-0.5 dark:text-white":
                enabled,
            })}
            size="icon-sm"
            aria-label={t(enabled ? "labelDisable" : "labelEnable")}
            aria-pressed={enabled}
            disabled={save.isPending}
            isPending={save.isPending}
            hasErrored={save.hasErrored}
            onClick={() =>
              save.execute({
                agentId,
                activityId,
                seconds: enabled ? null : 43_200,
              })
            }
          >
            <ClockFading />
          </ButtonAction>
        }
      />
      <TooltipContent>
        {save.hasErrored
          ? t("errorSave")
          : deadline
            ? t("descriptionScheduled", { date: deadline })
            : t("labelEnable")}
      </TooltipContent>
    </Tooltip>
  );
}
