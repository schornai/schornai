"use client";

import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import type { ReactNode } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function ContainerChatMessagePart({
  agentColor,
  children,
  className,
}: {
  agentColor?: AppColor;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <ContainerStyled
      appColor={agentColor}
      className={cn(
        "bg-muted rounded-2xl",
        {
          "bg-(--color-default)/10 dark:bg-(--color-dark)/20": agentColor,
        },
        className,
      )}
    >
      {children}
    </ContainerStyled>
  );
}
