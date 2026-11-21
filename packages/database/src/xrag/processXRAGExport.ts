import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "../_shared/_types.ts";
import { packageObjectSchema } from "./packageSchema.ts";
import { getXRAGWorkerOptions } from "./getXRAGWorkerOptions.ts";
import { getAuthorizedResource } from "./getAuthorizedResource.ts";
import { getXRAGPackageModel } from "./getXRAGPackageModel.ts";
import { streamPackageExport } from "./streamPackageExport.ts";
import { uploadExportStream } from "./uploadExportStream.ts";

/** Same lease/renew/reclaim protocol as artifact publications. An attempt has a
 * unique object path, so an expired worker cannot overwrite a successor's export. */
export async function processXRAGExport({
  supabase,
  signal,
  endpoint,
  token,
}: {
  supabase: SupabaseClient;
  signal: AbortSignal;
  endpoint: string;
  token: string;
}) {
  const owner = randomUUID();
  const claimed = await supabase.rpc("claim_xrag_export", {
    p_owner_token: owner,
  });
  if (claimed.error) throw new Error("XRAG_CLAIM_FAILED");
  const job = claimed.data?.[0];
  if (!job) return { worked: false };
  const controller = new AbortController();
  const processing = AbortSignal.any([signal, controller.signal]);
  let bytes = 0;
  let total: number | undefined;
  let published = false;
  let finishAttempted = false;
  let renewal: Promise<void> | undefined;
  const path = `${job.user_id}/${owner}/${job.name}`;
  const update = (state = "processing", objectPath?: string) =>
    supabase.rpc("update_xrag_export", {
      p_id: job.id,
      p_owner_token: owner,
      p_state: state,
      p_bytes: bytes,
      ...(total === undefined ? {} : { p_total: total }),
      ...(objectPath ? { p_path: objectPath } : {}),
    });
  const timer = setInterval(() => {
    if (renewal || processing.aborted) return;
    renewal = (async () => {
      const result = await update();
      if (result.error || !result.data)
        controller.abort(new Error("XRAG_LEASE_LOST"));
    })()
      .catch(() => controller.abort(new Error("XRAG_LEASE_LOST")))
      .finally(() => {
        renewal = undefined;
      });
  }, 20_000);
  try {
    const selections = z
      .array(packageObjectSchema)
      .min(1)
      .max(1000)
      .parse(job.selections);
    const options = await getXRAGWorkerOptions(
      job.user_id,
      job.claims,
      supabase,
      processing,
    );
    await streamPackageExport(
      selections,
      async (stream, size) => {
        total = size;
        await uploadExportStream(stream, size, path, {
          endpoint,
          token,
          signal: processing,
          onProgress: (sent) => {
            bytes = sent;
          },
        });
      },
      options,
      owner,
    );
    processing.throwIfAborted();
    const info = await supabase.storage.from("xrag-exports").info(path);
    if (info.error || info.data?.size !== total)
      throw new Error("XRAG_UPLOAD_FAILED");
    // Recheck current permissions after a potentially multi-hour transfer.
    const current = await getXRAGWorkerOptions(
      job.user_id,
      job.claims,
      supabase,
      processing,
    );
    for (const selection of selections) {
      if (selection.kind === "model")
        await getXRAGPackageModel(selection.id, current);
      else await getAuthorizedResource(selection.kind, selection.id, current);
    }
    clearInterval(timer);
    await renewal;
    processing.throwIfAborted();
    bytes = total!;
    finishAttempted = true;
    const finished = await update("finished", path);
    if (finished.error || !finished.data) throw new Error("XRAG_LEASE_LOST");
    published = true;
    return { worked: true };
  } catch (error) {
    clearInterval(timer);
    await renewal;
    if (!processing.aborted) {
      const terminal =
        error instanceof Error &&
        (error.message === "NOT_AUTHORIZED" ||
          error.message === "XRAG_REFERENCE_UNAVAILABLE" ||
          /XRAG_(CHECKSUM|SOURCE|INVALID|COLLECTION|MODEL|ENTRY|EXTRACTED)/.test(
            error.message,
          ) ||
          error.name === "ZodError");
      await update(terminal || job.attempts >= 5 ? "error" : "queued");
    }
    if (signal.aborted) throw signal.reason;
    return { worked: true };
  } finally {
    clearInterval(timer);
    await renewal;
    if (!published && finishAttempted) {
      // A lost RPC response may hide a successful commit. Never delete its file.
      const recorded = await supabase
        .from("xrag_export_jobs")
        .select("state,object_path")
        .eq("id", job.id)
        .maybeSingle();
      published = Boolean(
        recorded.error ||
        (recorded.data?.state === "finished" &&
          recorded.data.object_path === path),
      );
    }
    if (!published) await supabase.storage.from("xrag-exports").remove([path]);
  }
}
