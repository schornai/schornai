import { createClient } from "@/supabase/server";

export async function updateTranscriptionSummary(
  transcriptionId: string,
  summary?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transcriptions")
    .update({ summary: summary ?? null })
    .eq("id", transcriptionId);

  if (error) {
    throw new Error(undefined, { cause: error });
  }
}
