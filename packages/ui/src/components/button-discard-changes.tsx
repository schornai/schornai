"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";
import type { ComponentProps } from "react";
import { PencilLine } from "lucide-react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";

export function ButtonDiscardChanges({
  className,
  objA,
  objB,
  variant,
  ...props
}: {
  objA: unknown;
  objB: unknown;
  variant?: "inline";
} & ComponentProps<typeof TooltipTrigger>) {
  const equal = composite(objA) === composite(objB);

  if (equal) {
    return undefined;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          {
            "text-muted-foreground": variant === "inline",
          },
          className,
        )}
        {...props}
      >
        <PencilLine
          className={cn({
            "size-3.5": variant === "inline",
          })}
        />
      </TooltipTrigger>
      <TooltipContent>Änderung verwerfen</TooltipContent>
    </Tooltip>
  );
}
