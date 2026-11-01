import type { SupabaseClient } from "../_shared/_types.ts";
import { userClaimsSchema } from "../auth/_schemas.ts";

export async function getCurrentUserClaims({
  supabaseAuth,
}: {
  supabaseAuth: SupabaseClient["auth"];
}) {
  const { data, error } = await supabaseAuth.getClaims();

  if (error) {
    throw error;
  }

  const { data: parsed } = userClaimsSchema.safeParse(
    data?.claims.organization_roles,
  );
  return parsed ?? [];
}
