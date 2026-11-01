import { ComponentProps } from "react";
import { cn } from "../lib/utils.ts";

export function CodeInline({ className, ...props }: ComponentProps<"code">) {
  return (
    <code
      {...props}
      className={cn(
        "bg-muted text-foreground rounded-sm p-0.5 font-mono text-sm",
        className,
      )}
    />
  );
}
