"use client";

import { useState } from "react";
import { X, XCircle } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { FieldError } from "@schornio/aibox-package-ui/components/field";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { disconnectMCP } from "../_actions/disconnectMCP";

export function MCPDisconnectButton({ serverUrl }: { serverUrl: string }) {
  const { t } = useT("me", { keyPrefix: "connections.page" });
  const [open, setOpen] = useState(false);
  const action = useAction(disconnectMCP, { onSuccess: () => setOpen(false) });
  return (
    <>
      <Button
        variant="destructive"
        size="icon-sm"
        title={t("labelDisconnect")}
        aria-label={t("labelDisconnectNamed", { serverUrl })}
        onClick={() => setOpen(true)}
      >
        <X />
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !action.isPending) {
            setOpen(false);
            action.reset();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMediaDestructive>
              <XCircle />
            </AlertDialogMediaDestructive>
            <AlertDialogTitle>{t("labelDisconnect")}</AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere">
              {t("descriptionDisconnect", { serverUrl })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {action.hasErrored && <FieldError>{t("errorDisconnect")}</FieldError>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={action.isPending}>
              {t("labelCancel")}
            </AlertDialogCancel>
            <ButtonAction
              variant="destructive"
              isPending={action.isPending}
              disabled={action.isPending}
              hasErrored={action.hasErrored}
              onClick={() => action.execute({ serverUrl })}
            >
              {t("labelDisconnect")}
            </ButtonAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
