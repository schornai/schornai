import type { SupabaseClient } from "../_shared/_types.ts";

export async function deleteAgent(
  agentId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  await supabase.from("chatbots").delete().eq("id", agentId).throwOnError();
}
