import { getWorkspaces } from "@schornio/aibox-package-database/workspace/getWorkspaces";
import { createClientWithClaims } from "@schornio/aibox-package-database/auth/createClientWithClaims";
import { buildAccessToken } from "@schornio/aibox-package-database/user/buildAccessToken";
import { getGrant } from "@schornio/aibox-package-database/platformMcp/getGrant";
import {
  platformAccessLevels,
  requirePlatformAccess,
  limitPlatformClaims,
  type PlatformAccessLevel,
} from "@schornio/aibox-package-database/mcp/platformAccess";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { hashCredential } from "./oauth";

export async function authenticatePlatformMcp(
  request: Request,
  resource: string,
  level: PlatformAccessLevel,
) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/i)?.[1];
  if (!token) return null;
  const supabaseServiceRole = createSupabaseServiceRoleClient();
  const grant = await getGrant(hashCredential(token), resource, {
    supabase: supabaseServiceRole,
  });
  if (
    !grant ||
    grant.access_level !== level ||
    !platformAccessLevels.includes(level)
  )
    return null;
  const { data, error } = await supabaseServiceRole.auth.admin.getUserById(
    grant.user_id,
  );
  if (
    error ||
    !data.user ||
    (data.user.banned_until && new Date(data.user.banned_until) > new Date())
  )
    return null;
  const currentClaims = await buildAccessToken(
    { user_id: data.user.id, claims: { app_metadata: data.user.app_metadata } },
    { supabaseServiceRole },
  );
  requirePlatformAccess(currentClaims, level, "user");
  const workspaceIds =
    currentClaims === "admin" && level !== "admin"
      ? (await getWorkspaces({ supabase: supabaseServiceRole })).map(
          (workspace) => workspace.id,
        )
      : [];
  const claims = limitPlatformClaims(currentClaims, level, workspaceIds);
  const supabase = await createClientWithClaims(data.user.id, claims, {
    environmentKeys: {
      supabaseJWTSecret: "SUPABASE_JWT_SECRET",
      supabaseKey: "SUPABASE_PUBLIC_ANON_KEY",
      supabaseUrl: "SUPABASE_URL",
    },
  });
  return {
    userId: data.user.id,
    claims,
    level,
    supabase,
    supabaseServiceRole,
    clientOrigin: new URL(grant.redirect_uri).origin,
  };
}
