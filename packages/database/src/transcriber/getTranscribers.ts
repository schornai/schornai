import type { SupabaseClient } from "../_shared/_types.ts";
import { mapTranscriberWithLegacySupport } from "./_mappers.ts";

export async function getTranscribers({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const { data, error } = await supabase
    .from("transcribers")
    .select()
    .order("name");

  if (error) {
    throw new Error(undefined, { cause: error });
  }

  return await Promise.all(
    data.map((dbTranscriber) =>
      mapTranscriberWithLegacySupport(dbTranscriber, { supabase }),
    ),
  );
}
