import type { SupabaseClient } from "@schornio/aibox-package-database/_shared/_types";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";

export async function requireWorkspaceAdmin(
  workspaceId: string,
  supabase: SupabaseClient,
) {
  const claims = await getCurrentUserClaims({ supabaseAuth: supabase.auth });
  if (
    claims !== "admin" &&
    !claims.some(
      (claim) =>
        claim.organization_id === workspaceId &&
        claim.role === "workspace-admin",
    )
  )
    throw new Error("NOT_AUTHORIZED");
}
