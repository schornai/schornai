import type { SupabaseClient } from "../_shared/_types.ts";
import { buildAccessToken } from "../user/buildAccessToken.ts";
import {
  limitPlatformClaims,
  type PlatformAccessLevel,
} from "../mcp/platformAccess.ts";
import { getWorkspaces } from "../workspace/getWorkspaces.ts";

/** Internal worker only. Resolve current roles, including SSO mappings, instead
 * of persisting an access token or trusting permissions from creation time. */
export async function getAutomationOwner(
  userId: string,
  {
    supabase,
    level = "admin",
  }: { supabase: SupabaseClient; level?: PlatformAccessLevel },
) {
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
  const claims = await buildAccessToken(
    { user_id: userId, claims: { app_metadata: user.app_metadata } },
    { supabaseServiceRole: supabase },
  );
  // Apply the saved/requested ceiling before creating the user client, so
  // attachment reads cannot borrow the owner's wider administrative access.
  const ids =
    claims === "admin" && level !== "admin"
      ? (await getWorkspaces({ supabase })).map((workspace) => workspace.id)
      : [];
  return limitPlatformClaims(claims, level, ids);
}
