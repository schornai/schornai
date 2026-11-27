"use client";

import { useState } from "react";
import { useT } from "next-i18next/client";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { X } from "lucide-react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
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

export function ResourceRemovalDialog({
  label,
  title,
  description,
  cancel,
  onConfirm,
  isPending,
  hasErrored,
  errorMessage,
  onOpen,
  disabled,
}: {
  onOpen?: () => void;
  disabled?: boolean;
  errorMessage?: string;
  label: string;
  title: string;
  description: string;
  cancel: string;
  onConfirm: () => void;
  isPending: boolean;
  hasErrored: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useT("common", {
    keyPrefix: "_components.ResourceRemovalDialog",
  });
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        if (next) onOpen?.();
        setOpen(next);
      }}
    >
      <AlertDialogTrigger
        render={<Button variant="destructive" disabled={disabled} />}
      >
        <X />
        {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {hasErrored && (
          <Alert variant="destructive">
            <AlertDescription>
              {errorMessage ?? t("errorRemove")}
            </AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancel}</AlertDialogCancel>
          <ButtonAction
            variant="destructive"
            isPending={isPending}
            hasErrored={hasErrored}
            onClick={onConfirm}
          >
            <X />
            {label}
          </ButtonAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
