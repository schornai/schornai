import type { SupabaseClient } from "../_shared/_types.ts";
import { XRAG_BUCKET } from "./_schema.ts";

/** Server-only: caller MUST authorize a global admin. This queues durable work;
 * successful return acknowledges queueing, not validation or machine installation.
 * The upload remains the permanent immutable object: no copy or rename is needed.
 */
export async function publishArtifact(
  uploadPath: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const name = uploadPath.split("/").at(-1)!;
  if (
    !/^(?:uploads\/[0-9a-f-]{36}\/)?[^/\\]+$/i.test(uploadPath) ||
    name === "." ||
    name === ".."
  )
    throw new Error("INVALID_ARTIFACT_NAME");
  const { data: existing, error: existingError } = await supabase
    .from("artifact_publications")
    .select("id")
    .eq("upload_path", uploadPath)
    .maybeSingle();
  if (existingError) throw new Error("XRAG_PUBLISH_FAILED");
  if (existing) return existing.id;
  // Refuse empty/missing uploads before sealing a path. info reads metadata only.
  const { data, error } = await supabase.storage
    .from(XRAG_BUCKET)
    .info(uploadPath);
  if (
    error ||
    !data ||
    !Number.isSafeInteger(data.size) ||
    !data.size ||
    data.size > 200 * 1024 ** 3
  )
    throw new Error("XRAG_PUBLISH_FAILED");
  const queued = await supabase
    .from("artifact_publications")
    .upsert(
      { upload_path: uploadPath, name },
      { onConflict: "upload_path", ignoreDuplicates: true },
    );
  if (queued.error) throw new Error("XRAG_PUBLISH_FAILED");
  const job = await supabase
    .from("artifact_publications")
    .select("id")
    .eq("upload_path", uploadPath)
    .single();
  if (job.error || !job.data) throw new Error("XRAG_PUBLISH_FAILED");
  return job.data.id;
}
