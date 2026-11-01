import type { ComponentProps } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@schornio/aibox-package-ui/components/avatar";
import { UserRound } from "lucide-react";

export function AvatarUser({
  avatarUrl,
  className,
  firstName,
  lastName,
  size2XL,
  size8XL,
  ...avatarProps
}: {
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
  size2XL?: boolean;
  size8XL?: boolean;
} & ComponentProps<typeof Avatar>) {
  const initials =
    `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}`.trim();

  return (
    <Avatar
      {...avatarProps}
      className={cn(
        "[&_svg]:size-4",
        {
          "size-48 [&_svg]:size-24": size8XL,
          "size-18 [&_svg]:size-8": size2XL,
        },
        className,
      )}
    >
      {avatarUrl ? (
        <AvatarImage
          src={
            /^https?:\/\//i.test(avatarUrl)
              ? avatarUrl
              : `/api/storage/${avatarUrl}`
          }
          referrerPolicy="no-referrer"
        />
      ) : undefined}
      <AvatarFallback
        className={cn({ "text-8xl": size8XL, "text-2xl": size2XL })}
      >
        {initials.length > 0 ? initials : <UserRound />}
      </AvatarFallback>
    </Avatar>
  );
}
