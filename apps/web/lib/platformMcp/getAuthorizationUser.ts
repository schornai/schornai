import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { buildAccessToken } from "@schornio/aibox-package-database/user/buildAccessToken";
import { availablePlatformAccessLevels } from "@schornio/aibox-package-database/mcp/platformAccess";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";

/** Authenticate first, then resolve current roles rather than stale session claims. */
export async function getAuthorizationUser() {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser({ supabaseAuth: supabase.auth });
  if (user.banned_until && new Date(user.banned_until) > new Date())
    throw new Error("NOT_AUTHORIZED");
  const claims = await buildAccessToken(
    { user_id: user.id, claims: { app_metadata: user.app_metadata } },
    { supabaseServiceRole: createSupabaseServiceRoleClient() },
  );
  return { user, claims, levels: availablePlatformAccessLevels(claims) };
}
