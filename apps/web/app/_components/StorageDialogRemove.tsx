// "use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import type { Dispatch, SetStateAction } from "react";
import { FileX, FolderX } from "lucide-react";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { storageRemove } from "../_actions/storageRemove";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useStorageView } from "./StorageViewProvider";
import { useT } from "next-i18next/client";

export function StorageDialogRemove({
  open,
  onOpenChange,
  path,
  type,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  path: string;
  type: "file" | "folder";
}) {
  const { storage } = useStorageView();
  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { executeAsync, isPending } = useAction(storageRemove, actionUtils);
  const { t } = useT("common", {
    keyPrefix: "_components.StorageDialogRemove",
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMediaDestructive>
            {type === "file" ? <FileX /> : undefined}
            {type === "folder" ? <FolderX /> : undefined}
          </AlertDialogMediaDestructive>
          <AlertDialogTitle>{t("labelTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("labelDescription", { name: path.split("/").pop() })}
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
                  void executeAsync({
                    path,
                    storage,
                  }).then(() => {
                    onOpenChange(false);
                  })
                }
                variant="destructive"
              >
                {t("labelRemove")} "{path.split("/").pop()}"
              </ButtonAction>
            }
            variant="destructive"
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
