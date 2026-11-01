import { createClient } from "@/supabase/server";

export async function updateTranscriptionFilePath(
  transcriptionId: string,
  fileFullPath: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transcriptions")
    .update({
      file_full_path: fileFullPath,
    })
    .eq("id", transcriptionId);

  if (error) {
    throw new Error(undefined, { cause: error });
  }
}
