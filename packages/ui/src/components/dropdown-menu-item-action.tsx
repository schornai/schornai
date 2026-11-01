import { CircleCheck, LoaderCircle, XCircle } from "lucide-react";
import { DropdownMenuItem } from "./dropdown-menu.tsx";
import type { ComponentProps } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function DropdownMenuItemAction({
  children,
  className,
  disabled = false,
  hasErrored = false,
  hasSucceeded = false,
  indicator = "after",
  isPending = false,
  variant,
  ...dropdownMenuItemProps
}: {
  hasErrored?: boolean;
  hasSucceeded?: boolean;
  indicator?: "after" | "replace";
  isPending?: boolean;
} & ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem
      className={cn(
        "text-nowrap",
        {
          "bg-green-500/10 text-green-500 hover:bg-green-500/20 focus-visible:border-green-500/40 focus-visible:ring-green-500/20 dark:bg-green-500/20 dark:hover:bg-green-500/30 dark:focus-visible:ring-green-500/40":
            hasSucceeded,
          "bg-red-500/10 text-red-500 hover:bg-red-500/20 focus-visible:border-red-500/40 focus-visible:ring-red-500/20 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:focus-visible:ring-red-500/40":
            hasErrored || variant === "destructive",
        },
        className,
      )}
      disabled={disabled || isPending}
      {...dropdownMenuItemProps}
    >
      {indicator === "replace" && (hasErrored || hasSucceeded || isPending)
        ? undefined
        : children}
      {isPending && !(hasErrored || hasSucceeded) ? (
        <LoaderCircle className="animate-spin" />
      ) : undefined}
      {hasErrored ? <XCircle /> : undefined}
      {hasSucceeded ? <CircleCheck /> : undefined}
    </DropdownMenuItem>
  );
}
