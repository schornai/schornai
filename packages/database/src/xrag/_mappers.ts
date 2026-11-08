import { artifactSchema } from "./_schema.ts";
import type { SupabaseDatabase } from "../_shared/_types.ts";

export function mapArtifact(
  row: SupabaseDatabase["public"]["Tables"]["artifact_catalog"]["Row"],
) {
  const metadata = artifactSchema.parse(row.metadata);
  if (metadata.id !== row.id) throw new Error("INVALID_ARTIFACT");
  return artifactSchema.parse({
    ...metadata,
    createdAt: new Date(row.created_at).toISOString(),
    ...(row.deleted_at
      ? { deletedAt: new Date(row.deleted_at).toISOString() }
      : {}),
    ...(row.purged_at
      ? { purgedAt: new Date(row.purged_at).toISOString() }
      : {}),
  });
}
