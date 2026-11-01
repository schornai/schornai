import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { listConnections } from "@schornio/aibox-package-database/connections/listConnections";

export const getAgentConnections = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const claims = await getCurrentUserClaims({ supabaseAuth: supabase.auth });
  if (
    claims !== "admin" &&
    !claims.some((claim) => claim.role === "workspace-admin")
  )
    return [];
  // Only authorized agent editors receive the explicit, secret-free metadata projection.
  return listConnections({ supabase: createSupabaseServiceRoleClient() });
});
