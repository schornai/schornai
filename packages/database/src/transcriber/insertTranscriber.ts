import type { Transcriber } from "@/model/transcriber/_types";
import { createClient } from "@/supabase/server";
import { mapTranscriber } from "./_mappers";

export async function insertTranscriber(
  transcriber: Partial<Transcriber> & {
    organizationId: Transcriber["organizationId"];
  },
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transcribers")
    .insert({
      ai_model_id: transcriber?.modelId,
      config: transcriber?.config,
      created_at: transcriber?.createdAt?.toISOString(),
      description: transcriber?.description,
      id: transcriber?.id,
      name: transcriber?.name,
      organization_id: transcriber.organizationId,
      prompt: transcriber?.prompt,
    })
    .select()
    .single();

  if (error) {
    throw new Error(undefined, { cause: error });
  }

  return mapTranscriber(data);
}
