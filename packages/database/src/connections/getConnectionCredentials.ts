import type { SupabaseClient } from "../_shared/_types.ts";
/** Server-only secret read. Caller must verify global admin access for editing,
 * or authorized agent access and obtain id from that agent's saved config. */
export async function getConnectionCredentials(
  id: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase
    .from("provider_connections")
    .select()
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load provider connection");
  return data;
}
