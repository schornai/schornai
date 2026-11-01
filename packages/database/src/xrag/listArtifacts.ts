import type { SupabaseClient } from "../_shared/_types.ts";
import { XRAG_BUCKET } from "./_schema.ts";
import { getArtifact } from "./getArtifact.ts";

/** Server-only: caller authorizes a global admin or the service sharing token. */
export async function listArtifacts(
  offset: number,
  { supabase }: { supabase: SupabaseClient },
) {
  const limit = 100;
  const { data, error } = await supabase.storage
    .from(XRAG_BUCKET)
    .list("catalog", {
      offset,
      limit,
      sortBy: { column: "name", order: "asc" },
    });
  if (error || !data) throw new Error("CATALOG_UNAVAILABLE");
  const artifacts = await Promise.all(
    data
      .filter((file) => /^[a-f0-9]{64}\.json$/.test(file.name))
      .map((file) => getArtifact(file.name.slice(0, -5), { supabase })),
  );
  return {
    artifacts,
    nextOffset: data.length === limit ? offset + limit : null,
  };
}
