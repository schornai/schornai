import type { SupabaseClient } from "../_shared/_types.ts";
import { mapTranscriber } from "./_mappers.ts";

export const getTranscriberById = async (
  transcriberId: string,
  { supabase }: { supabase: SupabaseClient },
) => {
  const { data } = await supabase
    .from("transcribers")
    .select()
    .eq("id", transcriberId)
    .single()
    .throwOnError();

  return mapTranscriber(data);
};
