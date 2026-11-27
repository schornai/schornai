"use client";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { X } from "lucide-react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
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
import { deleteAutomation } from "../_actions/deleteAutomation";

export function AutomationRemove({
  id,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  labeled = false,
}: {
  id: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  labeled?: boolean;
}) {
  const { t } = useT("automation");
  const router = useRouter();
  const pathname = usePathname();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const remove = useAction(deleteAutomation, {
    onSuccess: () => {
      setOpen(false);
      if (pathname.startsWith(`/app/automation/${id}`))
        router.push("/app/automation");
    },
  });
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <AlertDialogTrigger
          render={
            <Button
              variant="destructive"
              size={labeled ? "default" : "icon"}
              aria-label={t("labelDelete")}
            >
              <X />
              {labeled && t("labelDelete")}
            </Button>
          }
        />
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("labelDelete")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("descriptionDelete")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            {t("labelCancel")}
          </AlertDialogCancel>
          <ButtonAction
            variant="destructive"
            isPending={remove.isPending}
            hasErrored={remove.hasErrored}
            onClick={() => remove.execute({ id })}
          >
            <X />
            {t("labelDelete")}
          </ButtonAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
