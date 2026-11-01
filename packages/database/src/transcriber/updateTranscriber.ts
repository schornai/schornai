import type { SupabaseClient } from "../_shared/_types.ts";
import type { Transcriber_new } from "./_types.ts";

export async function updateTranscriber(
  transcriber: Transcriber_new,
  { supabase }: { supabase: SupabaseClient },
) {
  const { description, id, name, prompt, workspaceId, ...config } = transcriber;

  await supabase
    .from("transcribers")
    .update({
      config,
      description,
      name,
      organization_id: workspaceId,
      prompt,
    })
    .eq("id", id)
    // RLS can filter out the row without a database error; require a write.
    .select("id")
    .single()
    .throwOnError();
}
