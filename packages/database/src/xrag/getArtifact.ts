import type { SupabaseClient } from "../_shared/_types.ts";
import { mapArtifact } from "./_mappers.ts";

/** Server-only: caller authorizes a global admin or the service sharing token. */
export async function getArtifact(
  id: string,
  { supabase }: { supabase: SupabaseClient },
) {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error("INVALID_ARTIFACT_ID");
  const { data, error } = await supabase
    .from("artifact_catalog")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("CATALOG_UNAVAILABLE");
  if (!data) throw new Error("ARTIFACT_NOT_FOUND");
  return mapArtifact(data);
}
