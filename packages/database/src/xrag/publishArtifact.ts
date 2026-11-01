import { getArtifact } from "./getArtifact.ts";
import { randomUUID } from "node:crypto";
import { inspectArchive } from "xrag/archive";
import type { SupabaseClient } from "../_shared/_types.ts";
import { artifactSchema, XRAG_BUCKET } from "./_schema.ts";
import { getArtifactStream } from "./getArtifactStream.ts";
import { registerArtifactModel } from "./registerArtifactModel.ts";

/** Server-only: caller MUST authorize a global admin before passing a service-role client.
 * Publish the catalog marker last. Incomplete uploads never become installable.
 * Retain immutable archives so offline and newly provisioned machines can catch up.
 */
export async function publishArtifact(
  uploadPath: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const name = uploadPath.split("/").at(-1)!;
  if (
    !(
      uploadPath === name || /^uploads\/[0-9a-f-]{36}\/[^/]+$/i.test(uploadPath)
    ) ||
    !name ||
    name.includes("\\") ||
    name === "." ||
    name === ".."
  )
    throw new Error("INVALID_ARTIFACT_NAME");
  const bucket = supabase.storage.from(XRAG_BUCKET);
  const staging = `staging/${randomUUID()}.tar`;
  try {
    const copied = await bucket.copy(uploadPath, staging);
    if (copied.error) throw new Error("ARTIFACT_COPY_FAILED");
    const stream = await getArtifactStream(staging, {
      supabase,
      signal: AbortSignal.timeout(3_600_000),
    });
    const { id, size, xrag, metadata } = await inspectArchive(stream);
    const existing = await getArtifact(id, { supabase }).catch((error) => {
      if (error instanceof Error && error.message === "ARTIFACT_NOT_FOUND")
        return undefined;
      throw error;
    });
    if (existing?.deletedAt) throw new Error("ARTIFACT_WITHDRAWN");
    const fileSystemIdentifier = await registerArtifactModel(xrag, metadata, {
      supabase,
    });
    const artifact = artifactSchema.parse({
      id,
      name,
      size,
      xrag,
      createdAt: new Date().toISOString(),
      ...(fileSystemIdentifier ? { fileSystemIdentifier } : {}),
    });
    const archive = await bucket.copy(staging, `artifacts/${id}.tar`);
    if (archive.error && archive.error.statusCode !== "409")
      throw new Error("ARTIFACT_COPY_FAILED");
    // Immutable IDs also make concurrent publications and retried actions idempotent.
    const published = await bucket.upload(
      `catalog/${id}.json`,
      JSON.stringify(artifact),
      { contentType: "application/json", upsert: false },
    );
    if (published.error && published.error.statusCode !== "409")
      throw new Error("ARTIFACT_PUBLISH_FAILED");
    // A deletion can race with a duplicate publication after the initial read.
    // The immutable marker cannot be resurrected, and neither may its archive.
    const current = await getArtifact(id, { supabase });
    if (current.deletedAt) {
      const cleanup = await bucket.remove([`artifacts/${id}.tar`]);
      if (cleanup.error) throw new Error("ARTIFACT_DELETE_FAILED");
      throw new Error("ARTIFACT_WITHDRAWN");
    }
    const removed = await bucket.remove([uploadPath]);
    if (removed.error) throw new Error("ARTIFACT_UPLOAD_CLEANUP_FAILED");
    return id;
  } catch {
    throw new Error("XRAG_PUBLISH_FAILED");
  } finally {
    await bucket.remove([staging]);
  }
}
