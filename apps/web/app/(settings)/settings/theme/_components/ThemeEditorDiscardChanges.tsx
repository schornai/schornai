"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import { AlertDialogActionClose } from "@schornio/aibox-package-ui/components/alert-dialog-action-close";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { XCircle } from "lucide-react";
import type { ThemeEditorSettings } from "@/lib/themeEditorSettings";
import { useT } from "next-i18next/client";

export function ThemeEditorDiscardChanges({
  settings,
  savedSettings,
  disabled,
  onDiscard,
}: {
  settings: ThemeEditorSettings;
  savedSettings: ThemeEditorSettings;
  disabled: boolean;
  onDiscard: () => void;
}) {
  const { t } = useT("settings", {
    keyPrefix: "_components.ThemeEditorDiscardChanges",
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <ButtonDiscardChanges
            objA={savedSettings}
            objB={settings}
            disabled={disabled}
            aria-label={t("labelDiscardTheme")}
          />
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMediaDestructive>
            <XCircle />
          </AlertDialogMediaDestructive>
          <AlertDialogTitle>{t("labelDiscardTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("labelDiscardConfirm")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("labelCancel")}</AlertDialogCancel>
          <AlertDialogActionClose
            onClick={() => {
              if (!disabled) onDiscard();
            }}
            disabled={disabled}
            variant="destructive"
          >
            {t("labelDiscard")}
          </AlertDialogActionClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
