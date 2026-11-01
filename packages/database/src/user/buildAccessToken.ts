import type { AccessTokenWebhookBody } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { trySync } from "@schornio/aibox-package-utils/trySync";
import { z } from "zod/mini";
import { mapWorkspace } from "../workspace/_mappers.ts";

const roleNameSchema = z.union([
  z.literal("editor"),
  z.literal("user"),
  z.literal("workspace-admin"),
]);
type RoleName = z.infer<typeof roleNameSchema>;

const organizationRoleSchema = z.object({
  organization_id: z.string(),
  role: roleNameSchema,
});
type OrganizationRole = z.infer<typeof organizationRoleSchema>;

function tryGetGroups(groups?: unknown): {
  groups?: string[];
  error?: unknown;
} {
  if (Array.isArray(groups)) {
    const result = groups
      .map(tryGetGroups)
      .filter(
        (result): result is { groups: string[] } =>
          "groups" in result && Boolean(result.groups),
      )
      .map(({ groups }) => groups)
      .flat();
    return { groups: result };
  }

  if (typeof groups === "string") {
    return { groups: [groups] };
  }

  return { error: "Unexpected groups type" };
}

function tryGetOverride(overrides?: unknown): {
  overrides?: "admin" | OrganizationRole[];
  error?: unknown;
} {
  if (overrides === "admin") {
    return { overrides: "admin" };
  }

  if (typeof overrides === "string") {
    const { data } = trySync(() => JSON.parse(overrides) as unknown);
    const { data: parsedOverride } = z
      .union([
        z.literal("admin"),
        organizationRoleSchema,
        z.array(organizationRoleSchema),
      ])
      .safeParse(data);

    if (parsedOverride === "admin") {
      return { overrides: "admin" };
    }
    if (Array.isArray(parsedOverride)) {
      return { overrides: parsedOverride };
    }
    if (parsedOverride) {
      return { overrides: [parsedOverride] };
    }
  }

  const parsedOrganizationRole = organizationRoleSchema.safeParse(overrides);
  if (parsedOrganizationRole.success) {
    return { overrides: [parsedOrganizationRole.data] };
  }

  if (Array.isArray(overrides)) {
    const joinedOverrides: OrganizationRole[] = [];
    for (const result of overrides.map(tryGetOverride)) {
      if (result.overrides === "admin") {
        return { overrides: "admin" };
      }
      if (result.overrides) {
        joinedOverrides.push(...result.overrides);
      }
    }
    return { overrides: joinedOverrides };
  }

  return { error: "Unexpected override type" };
}

export async function buildAccessToken(
  accessToken: AccessTokenWebhookBody,
  { supabaseServiceRole }: { supabaseServiceRole: SupabaseClient },
): Promise<"admin" | OrganizationRole[]> {
  const organizationRoleMap = new Map<string, RoleName>();
  const rank: Record<RoleName, number> = {
    user: 0,
    editor: 1,
    "workspace-admin": 2,
  };
  const grant = (workspaceId: string, role: RoleName) => {
    const current = organizationRoleMap.get(workspaceId);
    if (!current || rank[role] > rank[current]) {
      organizationRoleMap.set(workspaceId, role);
    }
  };

  // user_metadata is editable through auth.updateUser, including on SSO
  // accounts. Only the Auth-managed SAML identity may grant mapped roles.
  // This operation is server-only; the caller must authenticate the Auth hook.
  const provider = accessToken.claims.app_metadata?.provider;
  let samlClaims: Record<string, unknown> | undefined;
  if (provider?.startsWith("sso:")) {
    const { data, error } = await supabaseServiceRole.auth.admin.getUserById(
      accessToken.user_id,
    );
    if (error || !data.user || data.user.id !== accessToken.user_id) {
      throw new Error("Unable to verify SSO identity");
    }
    const identity = data.user.is_sso_user
      ? data.user.identities?.find(
          (identity) =>
            identity.provider === provider &&
            identity.user_id === accessToken.user_id,
        )
      : undefined;
    const customClaims: unknown = identity?.identity_data?.custom_claims;
    if (
      customClaims &&
      typeof customClaims === "object" &&
      !Array.isArray(customClaims)
    ) {
      samlClaims = customClaims as Record<string, unknown>;
    }
  }

  // --- SAML Groups ---

  const { groups } = tryGetGroups(samlClaims?.groups);

  if (groups && groups.length > 0) {
    const { data: dbOrganizations } = await supabaseServiceRole
      .from("organizations")
      .select();

    for (const organization of dbOrganizations ?? []) {
      const workspace = mapWorkspace(organization);
      for (const [group, role] of [
        [workspace.samlMappingUser, "user"],
        [workspace.samlMappingEditor, "editor"],
        [workspace.samlMappingWorkspaceAdmin, "workspace-admin"],
      ] as const) {
        if (group && groups.includes(group)) grant(workspace.id, role);
      }
    }
  }

  // --- SAML Overrides ---

  const { overrides } = tryGetOverride(samlClaims?.overrides);

  if (overrides === "admin") {
    return "admin";
  }

  for (const overrideItem of overrides ?? []) {
    grant(overrideItem.organization_id, overrideItem.role);
  }

  // --- Roles in Database ---

  const { data: dbRoles } = await supabaseServiceRole
    .from("user_roles")
    .select()
    .eq("user_id", accessToken.user_id);

  if (dbRoles?.some((role) => role.role === "admin" && !role.organization_id)) {
    return "admin";
  }

  for (const dbRoleItem of dbRoles ?? []) {
    if (!dbRoleItem.organization_id) {
      continue;
    }

    grant(
      dbRoleItem.organization_id,
      dbRoleItem.role === "admin" ? "workspace-admin" : dbRoleItem.role,
    );
  }

  // --- Auto join ---

  const { data: autoJoinOrganizations } = await supabaseServiceRole
    .from("organizations")
    .select("*")
    .eq("auto_join", true);

  for (const autoJoinOrganizationItem of autoJoinOrganizations ?? []) {
    if (!organizationRoleMap.has(autoJoinOrganizationItem.id)) {
      organizationRoleMap.set(autoJoinOrganizationItem.id, "user");
    }
  }

  // --- Combine all roles ---

  return Array.from(organizationRoleMap).map(([organization_id, role]) => ({
    organization_id,
    role,
  }));
}
