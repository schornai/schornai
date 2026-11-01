import { AlertDialogMedia } from "./alert-dialog.tsx";
import type { ComponentProps } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function AlertDialogMediaDestructive({
  className,
  ...props
}: ComponentProps<typeof AlertDialogMedia>) {
  return (
    <AlertDialogMedia
      {...props}
      className={cn(
        "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive",
        className,
      )}
    />
  );
}
