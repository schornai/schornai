import type { SupabaseClient } from "../_shared/_types.ts";
import { mapWorkspace } from "./_mappers.ts";

export async function getWorkspaces({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const { data } = await supabase
    .from("organizations")
    .select()
    .order("name")
    .throwOnError();
  return data.map(mapWorkspace);
}
