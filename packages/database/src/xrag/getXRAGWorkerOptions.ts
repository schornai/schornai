import { createClientWithClaims } from "../auth/createClientWithClaims.ts";
import { buildAccessToken } from "../user/buildAccessToken.ts";
import { userClaimsSchema } from "../auth/_schemas.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import type { XRAGOptions } from "./authentication.ts";

/** Worker-only. Intersect current roles with the creator's authorized ceiling;
 * deletion, bans and revoked workspace roles take effect before publication. */
export async function getXRAGWorkerOptions(
  userId: string,
  savedClaims: unknown,
  supabase: SupabaseClient,
  signal?: AbortSignal,
): Promise<XRAGOptions> {
  const {
    data: { user },
    error,
  } = await supabase.auth.admin.getUserById(userId);
  if (
    error ||
    !user ||
    (user.banned_until && new Date(user.banned_until) > new Date())
  )
    throw new Error("NOT_AUTHORIZED");
  const current = await buildAccessToken(
    { user_id: userId, claims: { app_metadata: user.app_metadata } },
    { supabaseServiceRole: supabase },
  );
  const saved = userClaimsSchema.parse(savedClaims);
  const ranks = { user: 0, editor: 1, "workspace-admin": 2 };
  const claims =
    saved === "admin"
      ? current
      : current === "admin"
        ? saved
        : saved.flatMap((role) => {
            const now = current.find(
              (r) => r.organization_id === role.organization_id,
            );
            return now ? [ranks[now.role] < ranks[role.role] ? now : role] : [];
          });
  requirePlatformAccess(claims, "admin", "workspace");
  // Short-lived worker credentials are renewed per request, not stored in jobs.
  const userClient = await createClientWithClaims(
    userId,
    claims,
    undefined,
    true,
  );
  return {
    supabase: userClient,
    supabaseServiceRole: supabase,
    authenticated: { userId, claims },
    signal,
  };
}
