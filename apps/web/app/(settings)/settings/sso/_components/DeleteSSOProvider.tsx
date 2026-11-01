"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import { X, XCircle } from "lucide-react";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { deleteSSOProvider } from "../_actions/deleteSSOProvider";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function DeleteSSOProvider() {
  const { t } = useT("settings", {
    keyPrefix: "_components.DeleteSSOProvider",
  });
  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { executeAsync, isPending } = useAction(deleteSSOProvider, actionUtils);

  const [open, setOpen] = useState(false);

  return (
    <ContainerMain className="flex justify-center">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button variant="destructive">
              <X /> {t("buttonRemove")}
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMediaDestructive>
              <XCircle />
            </AlertDialogMediaDestructive>
            <AlertDialogTitle>{t("dialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("labelCancel")}</AlertDialogCancel>
            <AlertDialogAction
              render={
                <ButtonAction
                  hasErrored={hasErrored}
                  hasSucceeded={hasSucceeded}
                  isPending={isPending}
                  onClick={() =>
                    void executeAsync().then(() => {
                      setOpen(false);
                    })
                  }
                />
              }
              variant="destructive"
            >
              {t("buttonDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContainerMain>
  );
}
