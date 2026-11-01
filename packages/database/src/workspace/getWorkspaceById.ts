import type { SupabaseClient } from "../_shared/_types.ts";
import { mapWorkspace } from "./_mappers.ts";

export async function getWorkspaceById(
  workspaceId: string,
  {
    supabase,
  }: {
    supabase: SupabaseClient;
  },
) {
  const { data } = await supabase
    .from("organizations")
    .select()
    .eq("id", workspaceId)
    .maybeSingle()
    .throwOnError();

  return data ? mapWorkspace(data) : undefined;
}
