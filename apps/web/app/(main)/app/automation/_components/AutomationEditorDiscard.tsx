"use client";
import { XCircle } from "lucide-react";
import { useT } from "next-i18next/client";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import { AlertDialogActionClose } from "@schornio/aibox-package-ui/components/alert-dialog-action-close";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import type { AutomationInput } from "@schornio/aibox-package-database/automation/_schemas";
export function AutomationEditorDiscard({
  initial,
  value,
  onDiscard,
  disabled,
}: {
  initial: AutomationInput;
  value: AutomationInput;
  onDiscard: () => void;
  disabled?: boolean;
}) {
  const { t } = useT("automation");
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <ButtonDiscardChanges
            disabled={disabled}
            objA={initial}
            objB={value}
            aria-label={t("labelDiscard")}
          />
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMediaDestructive>
            <XCircle />
          </AlertDialogMediaDestructive>
          <AlertDialogTitle>{t("labelDiscard")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("descriptionDiscard")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("labelCancel")}</AlertDialogCancel>
          <AlertDialogActionClose variant="destructive" onClick={onDiscard}>
            {t("labelDiscard")}
          </AlertDialogActionClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
