import { Check, Circle, X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function Checklist({ className, ...props }: ComponentProps<"ul">) {
  return <ul {...props} className={cn("flex flex-col gap-2", className)} />;
}

export function ChecklistItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li
      {...props}
      className={cn("grid grid-cols-[auto_1fr] gap-x-2", className)}
    />
  );
}

export function ChecklistItemIndicator({
  className,
  variant,
  ...props
}: { variant?: "success" | "error" } & ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "row-span-2 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
        {
          "bg-destructive/10 text-destructive dark:bg-destructive/20":
            variant === "error",
          "bg-green-500/10 text-green-500 dark:bg-green-500/20":
            variant === "success",
          "bg-muted text-muted-foreground": !variant,
        },
        className,
      )}
    >
      {!variant ? <Circle className="size-3.5" /> : undefined}
      {variant === "success" ? <Check className="size-3.5" /> : undefined}
      {variant === "error" ? <X className="size-3.5" /> : undefined}
      {props.children}
    </div>
  );
}

export function ChecklistItemHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div {...props} className={cn("text-sm font-medium", className)} />;
}

export function ChecklistItemContent({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn("text-muted-foreground text-sm", className)}
    />
  );
}
