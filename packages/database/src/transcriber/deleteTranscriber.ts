import type { SupabaseClient } from "../_shared/_types.ts";

export async function deleteTranscriber(
  transcriberId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  await supabase
    .from("transcribers")
    .delete()
    .eq("id", transcriberId)
    // RLS can filter out the row without a database error; require a write.
    .select("id")
    .single()
    .throwOnError();
}
