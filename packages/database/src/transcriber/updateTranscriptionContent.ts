import type { TranscriptionContent } from "@/model/transcriber/_types";
import { createClient } from "@/supabase/server";

export async function updateTranscriptionContent(
  transcriptionId: string,
  content: TranscriptionContent,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transcriptions")
    .update({ content })
    .eq("id", transcriptionId);

  if (error) {
    throw new Error(undefined, { cause: error });
  }
}
