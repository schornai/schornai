"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";
import type { ComponentProps } from "react";
import { PencilLine } from "lucide-react";
import { useT } from "next-i18next/client";

export function InputChangeIndicator({
  ...props
}: ComponentProps<typeof InputGroupInput>) {
  const { t } = useT("common", {
    keyPrefix: "_components.InputChangeIndicator",
  });
  return (
    <InputGroup>
      <InputGroupInput {...props} />
      {props.value !== props.defaultValue ? (
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger render={<PencilLine className="select-all" />} />
            <TooltipContent>
              <p>{t("labelChanged")}</p>
            </TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      ) : undefined}
    </InputGroup>
  );
}
