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
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Field } from "@schornio/aibox-package-ui/components/field";
import { X } from "lucide-react";
import { updateProfileAvatar } from "../_actions/updateProfileAvatar";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function EditorAvatarDelete({
  targetUserId,
}: {
  targetUserId?: string;
}) {
  const { t } = useT("me", { keyPrefix: "_components.EditorAvatarDelete" });

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updateProfileAvatar, actionUtils);

  return (
    <Field>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="destructive">
              <X /> {t("buttonDelete")}
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMediaDestructive>
              <X />
            </AlertDialogMediaDestructive>
            <AlertDialogTitle>{t("alertDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("alertDeleteExplainer")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("alertDeleteCancel")}</AlertDialogCancel>
            <AlertDialogAction
              render={
                <ButtonAction
                  hasErrored={hasErrored}
                  hasSucceeded={hasSucceeded}
                  isPending={isPending}
                  onClick={() => {
                    execute({ avatarUrl: undefined, targetUserId });
                  }}
                  variant="destructive"
                >
                  {t("buttonDelete")}
                </ButtonAction>
              }
              variant="destructive"
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Field>
  );
}
