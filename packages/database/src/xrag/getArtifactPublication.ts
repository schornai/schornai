import { z } from "zod/v4";
import type { SupabaseClient } from "../_shared/_types.ts";
export const artifactPublicationSchema = z.object({
  id: z.uuid(),
  state: z.enum(["queued", "processing", "published", "error"]),
  artifactId: z.string().nullable(),
});
/** Server-only: caller MUST authorize a global admin. Returns no upload paths or internal errors. */
export async function getArtifactPublication(
  id: string,
  { supabase }: { supabase: SupabaseClient },
) {
  z.uuid().parse(id);
  const { data, error } = await supabase
    .from("artifact_publications")
    .select("id,state,artifact_id")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("ARTIFACT_PUBLICATION_NOT_FOUND");
  return artifactPublicationSchema.parse({
    id: data.id,
    state: data.state,
    artifactId: data.artifact_id,
  });
}
