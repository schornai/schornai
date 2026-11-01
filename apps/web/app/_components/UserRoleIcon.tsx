import {
  Ban,
  UserRound,
  UserRoundCog,
  UserRoundKey,
  UserRoundPen,
} from "lucide-react";

export function UserRoleIcon({
  className,
  role,
}: {
  className?: string;
  role?: string;
}) {
  switch (role) {
    case "admin":
      return <UserRoundKey className={className} />;
    case "workspace-admin":
      return <UserRoundCog className={className} />;
    case "editor":
      return <UserRoundPen className={className} />;
    case "user":
      return <UserRound className={className} />;
    default:
      return <Ban className={className} />;
  }
}
