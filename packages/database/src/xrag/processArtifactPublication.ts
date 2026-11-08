import type { Json } from "../_shared/_supabase.ts";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { inspectArchive } from "xrag/archive";
import type { SupabaseClient } from "../_shared/_types.ts";
import { artifactSchema } from "./_schema.ts";
import { getArtifactStream } from "./getArtifactStream.ts";
import { registerArtifactModel } from "./registerArtifactModel.ts";

/** Server-only worker operation. Reclaims expired owners after crashes; only a
 * current lease can publish. Payload memory is bounded, and no archive is copied.
 */
export async function processArtifactPublication({
  supabase,
  signal,
  maxArchiveBytes = 200 * 1024 ** 3,
}: {
  supabase: SupabaseClient;
  signal: AbortSignal;
  maxArchiveBytes?: number;
}) {
  const owner = randomUUID();
  const claimed = await supabase.rpc("claim_artifact_publication", {
    p_owner_token: owner,
  });
  if (claimed.error) throw new Error("ARTIFACT_CLAIM_FAILED");
  const job = claimed.data?.[0];
  if (!job) return { worked: false };
  const controller = new AbortController();
  const processingSignal = AbortSignal.any([signal, controller.signal]);
  let renewal: Promise<void> | undefined;
  const timer = setInterval(() => {
    if (renewal || processingSignal.aborted) return;
    renewal = (async () => {
      const renewed = await supabase.rpc("renew_artifact_publication", {
        p_id: job.id,
        p_owner_token: owner,
      });
      if (renewed.error || !renewed.data)
        controller.abort(new Error("ARTIFACT_LEASE_LOST"));
    })()
      .catch(() => controller.abort(new Error("ARTIFACT_LEASE_LOST")))
      .finally(() => {
        renewal = undefined;
      });
  }, 20_000);
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const touch = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(
      () => controller.abort(new Error("ARTIFACT_STREAM_IDLE")),
      120_000,
    );
  };
  let source: Readable | undefined;
  try {
    touch();
    const stream = await getArtifactStream(job.upload_path, {
      supabase,
      signal: processingSignal,
    });
    source = Readable.fromWeb(
      stream as import("node:stream/web").ReadableStream,
      { signal: processingSignal },
    );
    let bytes = 0;
    // inspectArchive owns the pipeline; this generator also cancels its source on rejection.
    async function* bounded() {
      for await (const chunk of source!) {
        touch();
        bytes += chunk.length;
        if (bytes > maxArchiveBytes) throw new Error("XRAG_ARCHIVE_LIMIT");
        yield chunk;
      }
    }
    const { id, size, xrag, metadata } = await inspectArchive(
      bounded(),
      processingSignal,
    );
    clearTimeout(idleTimer);
    const fileSystemIdentifier = await registerArtifactModel(xrag, metadata, {
      supabase,
    });
    processingSignal.throwIfAborted();
    const artifact = artifactSchema.parse({
      id,
      size,
      xrag,
      name: job.name,
      createdAt: new Date(job.created_at).toISOString(),
      ...(fileSystemIdentifier ? { fileSystemIdentifier } : {}),
    });
    const completed = await supabase.rpc("finish_artifact_publication", {
      p_id: job.id,
      p_owner_token: owner,
      p_metadata: artifact as Json,
    });
    if (completed.error) throw new Error("ARTIFACT_PUBLISH_FAILED");
    return { worked: true, artifactId: completed.data ?? undefined };
  } catch (error) {
    // A shutdown/lease loss is left recoverable by expiry. Malformed input is terminal.
    if (!processingSignal.aborted) {
      const malformed =
        error instanceof Error &&
        (/^XRAG_/.test(error.message) ||
          error.name === "ZodError" ||
          error instanceof SyntaxError);
      const failed = await supabase.rpc("fail_artifact_publication", {
        p_id: job.id,
        p_owner_token: owner,
        p_retryable: !malformed,
      });
      if (failed.error) throw new Error("ARTIFACT_FAILURE_RECORD_FAILED");
    }
    if (signal.aborted) throw signal.reason;
    return { worked: true };
  } finally {
    clearInterval(timer);
    clearTimeout(idleTimer);
    source?.destroy();
    await renewal;
  }
}
