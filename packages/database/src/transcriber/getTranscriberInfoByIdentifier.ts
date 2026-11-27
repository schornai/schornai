import type { SupabaseClient } from "../_shared/_types.ts";

/** Read only public display fields from transcribers visible to the caller. */
export async function getTranscriberInfoByIdentifier(
  identifier: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const display = () =>
    supabase.from("transcribers").select("id,name,description");
  const modern = await display()
    .is("ai_model_id", null)
    .eq("config->>identifier", identifier)
    .order("name")
    .order("id")
    .limit(1)
    .maybeSingle()
    .throwOnError();
  // Legacy rows use their row ID even if an older config contains a different identifier.
  const row =
    modern.data ??
    (
      await display()
        .eq("id", identifier)
        .or("ai_model_id.not.is.null,config->>identifier.is.null")
        .maybeSingle()
        .throwOnError()
    ).data;
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? undefined,
  };
}
