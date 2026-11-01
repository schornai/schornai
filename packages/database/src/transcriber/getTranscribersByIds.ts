import type { SupabaseClient } from "../_shared/_types.ts";
import { mapTranscriberWithLegacySupport } from "./_mappers.ts";

export async function getTranscribersByIds(
  transcriberIds: string[],
  { supabase }: { supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("transcribers")
    .select()
    .in("id", transcriberIds)
    .throwOnError();

  return await Promise.all(
    data.map((dbTranscriber) =>
      mapTranscriberWithLegacySupport(dbTranscriber, { supabase }),
    ),
  );
}
