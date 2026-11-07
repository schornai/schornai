import type { UserClaims } from "../auth/_types.ts";

export const platformAccessLevels = [
  "user",
  "editor",
  "workspace",
  "admin",
] as const;
export type PlatformAccessLevel = (typeof platformAccessLevels)[number];

/** Levels the caller can explicitly consent to; resource checks still apply. */
export function availablePlatformAccessLevels(claims: UserClaims) {
  return platformAccessLevels.filter((level) => {
    try {
      requirePlatformAccess(claims, level, level);
      return true;
    } catch {
      return false;
    }
  });
}

export function includesPlatformAccess(
  granted: PlatformAccessLevel,
  required: PlatformAccessLevel,
) {
  return (
    platformAccessLevels.indexOf(granted) >=
    platformAccessLevels.indexOf(required)
  );
}

/** Consent and agent ceilings never replace authorization of the target workspace. */
export function requirePlatformAccess(
  claims: UserClaims,
  ceiling: PlatformAccessLevel,
  required: PlatformAccessLevel,
  workspaceId?: string,
) {
  if (!includesPlatformAccess(ceiling, required))
    throw new Error("NOT_AUTHORIZED");
  if (claims === "admin") return;
  if (required === "admin") throw new Error("NOT_AUTHORIZED");
  const requiredRole = required === "workspace" ? "workspace-admin" : required;
  const ranks = { user: 0, editor: 1, "workspace-admin": 2 };
  if (
    !claims.some(
      (claim) =>
        (!workspaceId || claim.organization_id === workspaceId) &&
        ranks[claim.role] >= ranks[requiredRole],
    )
  )
    throw new Error("NOT_AUTHORIZED");
}

/** Preserve tenant membership while limiting downstream jobs to the consented
 * level. For a global administrator, the caller supplies verified workspace IDs. */
export function limitPlatformClaims(
  claims: UserClaims,
  level: PlatformAccessLevel,
  adminWorkspaceIds: string[] = [],
): UserClaims {
  if (level === "admin") return claims;
  const role = level === "workspace" ? "workspace-admin" : level;
  if (claims === "admin")
    return adminWorkspaceIds.map((organization_id) => ({
      organization_id,
      role,
    }));
  const rank = { user: 0, editor: 1, "workspace-admin": 2 };
  return claims.map((claim) => ({
    ...claim,
    role: rank[claim.role] > rank[role] ? role : claim.role,
  }));
}
