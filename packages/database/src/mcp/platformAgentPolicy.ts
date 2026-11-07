import {
  includesPlatformAccess,
  platformAccessLevels,
  type PlatformAccessLevel,
} from "./platformAccess.ts";
export const platformApprovalModes = ["auto", "ask", "off"] as const;
export type PlatformApprovalMode = (typeof platformApprovalModes)[number];
export type PlatformApprovalPolicy = Record<
  PlatformAccessLevel,
  PlatformApprovalMode
>;
export const defaultPlatformApprovals: PlatformApprovalPolicy = {
  user: "auto",
  editor: "auto",
  workspace: "ask",
  admin: "off",
};
export const defaultPlatformAgentAccess = {
  active: true,
  level: "workspace" as const,
  approvals: defaultPlatformApprovals,
};
/** Legacy configurations keep their access ceiling and never gain automatic writes. */
export function getPlatformApprovals(access?: {
  level: PlatformAccessLevel;
  approvals?: PlatformApprovalPolicy;
}): PlatformApprovalPolicy {
  if (!access) return { ...defaultPlatformApprovals };
  if (access.approvals) return access.approvals;
  return Object.fromEntries(
    platformAccessLevels.map((level) => [
      level,
      includesPlatformAccess(access.level, level) ? "ask" : "off",
    ]),
  ) as PlatformApprovalPolicy;
}
export function platformPolicyCeiling(
  policy: PlatformApprovalPolicy,
): PlatformAccessLevel {
  return (
    [...platformAccessLevels]
      .reverse()
      .find((level) => policy[level] !== "off") ?? "user"
  );
}
/** A few user tools also have explicitly privileged variants selected by input. */
export function platformInvocationLevel(
  name: string,
  level: PlatformAccessLevel,
  input: unknown,
  userId: string,
): PlatformAccessLevel {
  const value =
    input && typeof input === "object"
      ? (input as { kind?: unknown; userId?: unknown })
      : {};
  if (
    (name === "platform_asset_upload" ||
      name === "platform_asset_upload_url") &&
    (value.kind !== "avatar" ||
      (value.userId !== undefined && value.userId !== userId))
  )
    return "admin";
  if (
    name === "platform_profile_password_reset" &&
    value.userId !== undefined &&
    value.userId !== userId
  )
    return "admin";
  return level;
}
