import "server-only";
import { getAuthorizationUser } from "@/lib/platformMcp/getAuthorizationUser";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { requirePlatformAccess } from "@schornio/aibox-package-database/mcp/platformAccess";

export async function getAutomationContext() {
  const { user, claims } = await getAuthorizationUser();
  requirePlatformAccess(claims, "admin", "editor");
  return {
    userId: user.id,
    claims,
    supabase: await createSupabaseServerClient(),
    supabaseServiceRole: createSupabaseServiceRoleClient(),
  };
}
