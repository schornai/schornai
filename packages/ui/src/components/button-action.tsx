import { CircleCheck, LoaderCircle, XCircle } from "lucide-react";
import { Button } from "./button.tsx";
import type { ComponentProps } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function ButtonAction({
  children,
  className,
  disabled = false,
  hasErrored = false,
  hasSucceeded = false,
  indicator = "after",
  isPending = false,
  variant,
  ...buttonProps
}: {
  hasErrored?: boolean;
  hasSucceeded?: boolean;
  indicator?: "after" | "replace";
  isPending?: boolean;
} & ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        {
          "bg-green-500/10 text-green-500 hover:bg-green-500/20 focus-visible:border-green-500/40 focus-visible:ring-green-500/20 dark:bg-green-500/20 dark:hover:bg-green-500/30 dark:focus-visible:ring-green-500/40":
            hasSucceeded,
        },
        className,
      )}
      disabled={disabled || isPending}
      variant={hasErrored ? "destructive" : hasSucceeded ? "default" : variant}
      {...buttonProps}
    >
      {indicator === "replace" && (hasErrored || hasSucceeded || isPending)
        ? undefined
        : children}
      {isPending && !(hasErrored || hasSucceeded) ? (
        <LoaderCircle className="animate-spin" />
      ) : undefined}
      {hasErrored ? <XCircle /> : undefined}
      {hasSucceeded ? <CircleCheck /> : undefined}
    </Button>
  );
}
