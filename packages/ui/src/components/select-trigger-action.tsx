import type { ComponentProps } from "react";
import { SelectTrigger } from "./select.tsx";
import { cn } from "cn";

export function SelectTriggerAction({
  className,
  disabled = false,
  hasErrored = false,
  hasSucceeded = false,
  isPending = false,
  ...selectTriggerProps
}: {
  hasErrored?: boolean;
  hasSucceeded?: boolean;
  indicator?: "after" | "replace";
  isPending?: boolean;
} & ComponentProps<typeof SelectTrigger>) {
  return (
    <SelectTrigger
      {...selectTriggerProps}
      className={cn(
        {
          "bg-green-500/10 text-green-500 hover:bg-green-500/20 focus-visible:border-green-500/40 focus-visible:ring-green-500/20 dark:bg-green-500/20 dark:hover:bg-green-500/30 dark:focus-visible:ring-green-500/40":
            hasSucceeded,
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40":
            hasErrored,
          shimmer: isPending && !(hasErrored || hasSucceeded),
        },
        className,
      )}
      disabled={disabled || isPending}
    />
  );
}
