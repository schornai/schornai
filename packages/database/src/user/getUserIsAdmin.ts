import type { SupabaseClient } from "../_shared/_types.ts";

export async function getUserIsAdmin(
  userId: string,
  { supabaseServiceRole }: { supabaseServiceRole: SupabaseClient },
) {
  const { data } = await supabaseServiceRole
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1)
    .throwOnError();

  return data.length > 0;
}
