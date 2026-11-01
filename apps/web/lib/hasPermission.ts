import type { Role } from "@schornio/aibox-package-database/workspace/_types";

const permissionHirachy: Role[] = [
  "user",
  "editor",
  "workspace-admin",
  "admin",
];

export function hasPermission({
  claim,
  permission,
}: {
  claim?: Role;
  permission: Role;
}) {
  const claimLevel = permissionHirachy.findIndex((role) => role === claim);

  const permissionLevel = permissionHirachy.findIndex(
    (role) => role === permission,
  );

  return claimLevel >= permissionLevel;
}
