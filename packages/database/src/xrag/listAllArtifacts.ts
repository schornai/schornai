import type { SupabaseClient } from "../_shared/_types.ts";
import type { Artifact } from "./_schema.ts";
import { listArtifacts } from "./listArtifacts.ts";

/** Server-only: caller authorizes a global admin or the service sharing token. */
export async function listAllArtifacts(options: { supabase: SupabaseClient }) {
  const artifacts: Artifact[] = [];
  let offset: number | null = 0;
  while (offset !== null) {
    const page = await listArtifacts(offset, options);
    artifacts.push(...page.artifacts);
    offset = page.nextOffset;
  }
  return artifacts.sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
}
