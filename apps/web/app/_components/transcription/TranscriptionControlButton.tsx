"use client";

import type { ComponentProps } from "react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";

export function TranscriptionControlButton(
  props: ComponentProps<typeof Button> & { "aria-label": string },
) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button {...props} />} />
      <TooltipContent>{props["aria-label"]}</TooltipContent>
    </Tooltip>
  );
}
