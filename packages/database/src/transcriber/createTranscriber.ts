import type { SupabaseClient } from "../_shared/_types.ts";
import type { Transcriber_new } from "./_types.ts";

export async function createTranscriber(
  transcriber: Transcriber_new,
  { supabase }: { supabase: SupabaseClient },
) {
  const { description, id, name, prompt, workspaceId, ...config } = transcriber;

  await supabase
    .from("transcribers")
    .insert({
      config,
      description,
      id,
      name,
      organization_id: workspaceId,
      prompt,
    })
    .select()
    .single()
    .throwOnError();
}
