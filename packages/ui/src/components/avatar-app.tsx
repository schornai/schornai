import type {
  AppIcon,
  Image,
} from "@schornio/aibox-package-database/_shared/_types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@schornio/aibox-package-ui/components/avatar";
import type { ComponentProps } from "react";
import { DynamicIcon } from "lucide-react/dynamic";
import type { IconName } from "lucide-react/dynamic";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function AvatarApp({
  className,
  fallback,
  icon,
  image,
  ...props
}: {
  fallback?: string;
  icon?: AppIcon;
  image?: Image;
} & ComponentProps<typeof Avatar>) {
  return (
    <Avatar
      {...props}
      className={cn(
        "group-data-[collapsible=icon]:after:border-none",
        className,
      )}
    >
      {image ? (
        <AvatarImage src={`/api/storage/${image.path}`} />
      ) : (
        <AvatarFallback
          className={cn(
            "group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:bg-transparent",
            {
              // "bg-muted": !icon,
              "border border-black bg-transparent dark:border-white": icon,
            },
          )}
        >
          {icon ? (
            <DynamicIcon
              className="text-black group-data-[size=default]/avatar:size-4 group-data-[size=lg]/avatar:size-5 group-data-[size=sm]/avatar:size-3 dark:text-white"
              name={icon.iconName as IconName}
            />
          ) : (
            fallback
              ?.trim()
              .split(" ")
              .slice(0, 2)
              .map((slice) => slice[0])
              .join("")
              .toUpperCase()
          )}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
