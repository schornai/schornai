import type { SupabaseClient } from "../_shared/_types.ts";

// Server-only identity lookup. Callers using a privileged client must authorize
// the workspace before loading agent content or creating realtime documents.
export async function getAgentWorkspaceId(
  agentId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("chatbots")
    .select("organization_id")
    .eq("id", agentId)
    .maybeSingle()
    .throwOnError();
  return data?.organization_id;
}
