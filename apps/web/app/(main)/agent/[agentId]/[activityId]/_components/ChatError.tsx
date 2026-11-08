"use client";

import { AlertCircle, ChevronDown, RotateCcw } from "lucide-react";
import { useT } from "next-i18next/client";
import { useAction } from "next-safe-action/hooks";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { retryChatGeneration } from "../_actions/retryChatGeneration";

export function ChatError({
  error,
  agentId,
  activityId,
}: {
  error: string;
  agentId: string;
  activityId: string;
}) {
  const { t } = useT("agent", { keyPrefix: "_components.ChatError" });
  const { execute, isPending, hasErrored, hasSucceeded } =
    useAction(retryChatGeneration);
  const details = error.trim() || t("descriptionNoDetails");
  const firstLine = error.trim().split(/\r?\n/, 1)[0];
  const summary = firstLine
    ? firstLine.length > 140
      ? `${firstLine.slice(0, 140)}…`
      : firstLine
    : t("descriptionFailed");

  return (
    <Collapsible className="text-destructive border-destructive/20 bg-destructive/5 min-w-0 rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <CollapsibleTrigger className="group focus-visible:ring-destructive/40 flex min-w-0 grow basis-64 items-center gap-2 rounded-sm text-left text-sm outline-none focus-visible:ring-2">
          <AlertCircle className="size-4 shrink-0" />
          <span className="min-w-0 break-words" role="status">
            {summary}
          </span>
          <ChevronDown className="size-4 shrink-0 transition-transform group-aria-expanded:rotate-180" />
          <span className="sr-only">{t("labelDetails")}</span>
        </CollapsibleTrigger>
        <ButtonAction
          size="xs"
          variant="destructive"
          isPending={isPending}
          hasErrored={hasErrored}
          disabled={hasSucceeded}
          onClick={() => execute({ agentId, activityId })}
        >
          <RotateCcw data-icon="inline-start" />
          {t("labelRetry")}
        </ButtonAction>
      </div>
      <CollapsibleContent>
        <p className="mt-3 text-xs font-medium">{t("labelDetails")}</p>
        <pre className="mt-1 max-h-80 overflow-auto text-xs break-words whitespace-pre-wrap">
          {details}
        </pre>
      </CollapsibleContent>
      {hasErrored && (
        <p className="mt-2 text-sm" role="alert">
          {t("errorRetry")}
        </p>
      )}
    </Collapsible>
  );
}
