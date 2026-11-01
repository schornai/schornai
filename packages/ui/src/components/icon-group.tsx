import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils.ts";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip.tsx";
import { Button } from "./button.tsx";
import { ButtonAction } from "./button-action.tsx";

export function IconGroup({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex", className)} {...props} />;
}

export function IconGroupInfo({
  className,
  tooltip,
  children,
  ...props
}: { tooltip: ReactNode } & ComponentProps<typeof TooltipTrigger>) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "text-muted-foreground m-1.5 cursor-help [&_svg]:size-4",
          className,
        )}
        render={
          <button>
            <span className="sr-only">{tooltip}</span> {children}
          </button>
        }
        {...props}
      />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function IconGroupButton({
  tooltip,
  children,
  ...props
}: { tooltip: ReactNode } & ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button size="icon-sm" variant="ghost" {...props}>
            <span className="sr-only">{tooltip}</span> {children}
          </Button>
        }
      />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function IconGroupButtonAction({
  tooltip,
  children,
  ...props
}: { tooltip: ReactNode } & ComponentProps<typeof ButtonAction>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <ButtonAction size="icon-sm" variant="ghost" {...props}>
            <span className="sr-only">{tooltip}</span> {children}
          </ButtonAction>
        }
      />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
