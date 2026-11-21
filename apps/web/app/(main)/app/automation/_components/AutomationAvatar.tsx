"use client";
import type { ComponentProps } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { AvatarApp } from "@schornio/aibox-package-ui/components/avatar-app";
import {
  Avatar,
  AvatarFallback,
} from "@schornio/aibox-package-ui/components/avatar";
import { CircleChevronsRight } from "@/lib/icons/circle-chevrons-right";
export function AutomationAvatar({
  icon,
  fallback,
  className,
  ...props
}: ComponentProps<typeof AvatarApp>) {
  if (icon)
    return (
      <AvatarApp
        {...props}
        className={className}
        icon={icon}
        fallback={fallback}
      />
    );
  return (
    <Avatar
      {...props}
      className={cn(
        "group-data-[collapsible=icon]:after:border-none",
        className,
      )}
    >
      <AvatarFallback className="border-foreground border bg-transparent group-data-[collapsible=icon]:border-none">
        <CircleChevronsRight className="text-foreground group-data-[size=default]/avatar:size-4 group-data-[size=lg]/avatar:size-5 group-data-[size=sm]/avatar:size-3" />
      </AvatarFallback>
    </Avatar>
  );
}
