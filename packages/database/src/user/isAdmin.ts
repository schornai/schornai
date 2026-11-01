import type { SupabaseClient } from "../_shared/_types";

export async function isAdmin({ supabase }: { supabase: SupabaseClient }) {
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims.organization_roles === "admin";
}
