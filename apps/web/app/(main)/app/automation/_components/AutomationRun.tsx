"use client";
import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";
import { Play } from "lucide-react";
import { IconGroupButtonAction } from "@schornio/aibox-package-ui/components/icon-group";
import { DropdownMenuItemAction } from "@schornio/aibox-package-ui/components/dropdown-menu-item-action";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { FieldError } from "@schornio/aibox-package-ui/components/field";
import type { Automation } from "@schornio/aibox-package-database/automation/_types";
import { StoragePickerDialog } from "../../../../_components/StoragePickerDialog";
import { runAutomationNow } from "../_actions/runAutomationNow";

export function AutomationRun({
  automation,
  compact = false,
  menu = false,
}: {
  compact?: boolean;
  menu?: boolean;
  automation: Pick<Automation, "id" | "trigger">;
}) {
  const { t } = useT("automation");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const action = useAction(runAutomationNow, {
    onSuccess: () => {
      setOpen(false);
      setRequestId(crypto.randomUUID());
      router.push(`/app/automation/${automation.id}/runs`);
      router.refresh();
    },
  });
  const Action = compact ? IconGroupButtonAction : ButtonAction;
  const trigger = automation.trigger;
  const needsFile = trigger.type === "storage" && trigger.attachment !== "none";
  const run = () =>
    needsFile
      ? setOpen(true)
      : action.execute({ id: automation.id, requestId });
  return (
    <div className="flex flex-col items-start gap-2">
      {menu ? (
        <DropdownMenuItemAction
          className="w-full"
          closeOnClick={false}
          isPending={action.isPending}
          hasErrored={action.hasErrored}
          onClick={run}
        >
          <Play />
          {t("labelRunNow")}
        </DropdownMenuItemAction>
      ) : (
        <Action
          tooltip={t("labelRunNow")}
          aria-label={t("labelRunNow")}
          indicator={compact ? "replace" : "after"}
          variant={compact ? "ghost" : "outline"}
          isPending={action.isPending}
          hasErrored={action.hasErrored}
          onClick={run}
        >
          <Play />
          {!compact && t("labelRunNow")}
        </Action>
      )}
      {action.hasErrored && <FieldError>{t("errorRun")}</FieldError>}
      {needsFile && (
        <StoragePickerDialog
          open={open}
          onOpenChange={setOpen}
          mode="file"
          currentStorage={trigger.storage}
          title={t("labelTestFile")}
          description={t("descriptionTestFile", {
            folder: trigger.folder || "/",
          })}
          onSelect={async ({ storage, path }) => {
            if (
              !Object.entries(trigger.storage).every(
                ([key, value]) =>
                  value === storage[key as keyof typeof storage],
              )
            )
              throw new Error("AUTOMATION_FILE_OUTSIDE_SCOPE");
            const result = await action.executeAsync({
              id: automation.id,
              requestId,
              path,
            });
            if (!result?.data) throw new Error("AUTOMATION_RUN_FAILED");
          }}
        />
      )}
    </div>
  );
}
