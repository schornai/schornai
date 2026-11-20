import type { WorkspaceClaims } from "./getWorkspaceClaims";

export function canAdministerWorkspaces({ claims, isAdmin }: WorkspaceClaims) {
  return isAdmin || claims.some(({ claim }) => claim === "workspace-admin");
}
