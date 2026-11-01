import { cache } from "react";
import { createSupabaseServerClient } from "./createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "./createSupabaseServiceRoleClient";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";

/** Authorize the exact workspace before obtaining a privileged client.
 * Callers must constrain every operation to this workspaceId.
 */
export const getWorkspaceAdminContext = cache(async (workspaceId: string) => {
  if (!workspaceId) throw new Error("NOT_AUTHORIZED");
  const supabase = await createSupabaseServerClient();
  const claims = await getCurrentUserClaims({ supabaseAuth: supabase.auth });
  const isGlobalAdmin = claims === "admin";
  if (
    !isGlobalAdmin &&
    !claims.some(
      (claim) =>
        claim.organization_id === workspaceId &&
        claim.role === "workspace-admin",
    )
  )
    throw new Error("NOT_AUTHORIZED");
  return {
    supabaseServiceRole: createSupabaseServiceRoleClient(),
    isGlobalAdmin,
  };
});
