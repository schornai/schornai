import type { SupabaseClient } from "../_shared/_types.ts";
import { mapArtifact } from "./_mappers.ts";

/** Server-only: caller authorizes a global admin or the service sharing token. */
export async function listArtifacts(
  offset: number,
  { supabase }: { supabase: SupabaseClient },
) {
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new Error("INVALID_CATALOG_OFFSET");
  const limit = 100;
  const { data, error } = await supabase
    .from("artifact_catalog")
    .select("*")
    .order("id")
    .range(offset, offset + limit - 1);
  if (error || !data) throw new Error("CATALOG_UNAVAILABLE");
  return {
    artifacts: data.map(mapArtifact),
    nextOffset: data.length === limit ? offset + limit : null,
  };
}
