import type { SupabaseClient } from "../_shared/_types.ts";

export async function updateWorkspaceAutoJoin(
  workspaceId: string,
  { autoJoin }: { autoJoin: boolean },
  {
    supabaseServiceRole,
  }: {
    supabaseServiceRole: SupabaseClient;
  },
) {
  await supabaseServiceRole
    .from("organizations")
    .update({
      auto_join: autoJoin,
    })
    .eq("id", workspaceId)
    .throwOnError();
}
