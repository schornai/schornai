import type { SupabaseClient } from "../_shared/_types.ts";
import { buildAccessToken } from "../user/buildAccessToken.ts";

/** Internal worker only. Resolve current roles, including SSO mappings, instead
 * of persisting an access token or trusting permissions from creation time. */
export async function getAutomationOwner(
  userId: string,
  { supabase }: { supabase: SupabaseClient },
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
  return buildAccessToken(
    { user_id: userId, claims: { app_metadata: user.app_metadata } },
    { supabaseServiceRole: supabase },
  );
}
