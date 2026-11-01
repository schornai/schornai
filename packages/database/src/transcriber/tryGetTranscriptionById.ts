import { cache } from "react";
import { createClient } from "@/supabase/server";
import { mapTranscription } from "./_mappers";

export const tryGetTranscriptionById = cache(
  async (transcriptionId?: string) => {
    if (!transcriptionId) {
      return undefined;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("transcriptions")
      .select()
      .eq("id", transcriptionId)
      .maybeSingle();

    if (error) {
      throw new Error(undefined, { cause: error });
    }

    if (!data) {
      return undefined;
    }

    return mapTranscription(data);
  },
);
