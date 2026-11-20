import { deletePreparedXRAGTransfer } from "./deletePreparedXRAGTransfer.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { withImportLease } from "./withImportLease.ts";
import { XRAG_BUCKET } from "./_schema.ts";
import { createImportStorageClient } from "./createImportStorageClient.ts";
import {
  IMPORT_STAGING_BUCKET,
  readImport,
  renewImport,
} from "./importTransaction.ts";

/** Trusted worker only. Undo is durable and repeatable; do not release reservations
 * or delete backups until every original has been restored. */
export async function recoverXRAGImport(
  id: string,
  {
    supabase,
    token,
    signal,
  }: {
    supabase: SupabaseClient;
    token?: string;
    signal?: AbortSignal;
  },
) {
  let job = await readImport(id, supabase);
  if (job.cleaned_at) return;
  if (!["committed", "rolled_back"].includes(job.state)) {
    const nextToken = crypto.randomUUID();
    let claim = supabase
      .from("xrag_import_transactions")
      .update({
        token: nextToken,
        state: "rolling_back",
        expires_at: new Date(Date.now() + 300_000).toISOString(),
      })
      .eq("id", id)
      .eq("token", job.token)
      .eq("state", job.state);
    // An active caller may unwind immediately. Maintenance only takes expired work.
    claim = token
      ? claim.eq("token", token)
      : claim.lt("expires_at", new Date().toISOString());
    const result = await claim.select("id").maybeSingle();
    if (result.error) throw new Error("XRAG_IMPORT_RECOVERY_FAILED");
    if (!result.data) return;
    job = await readImport(id, supabase);
    const storage = createImportStorageClient(id, nextToken).storage;
    await withImportLease(
      id,
      nextToken,
      supabase,
      signal,
      async (leaseSignal) => {
        if (job.files_applied) {
          for (const file of job.plan.files) {
            leaseSignal.throwIfAborted();
            await renewImport(id, nextToken, supabase);
            // A lost copy response can safely be retried after removing the target.
            const removed = await storage
              .from("database_files")
              .remove([file.path]);
            if (removed.error) throw new Error("XRAG_IMPORT_RECOVERY_FAILED");
            if (file.hadOriginal) {
              const restored = await storage
                .from(IMPORT_STAGING_BUCKET)
                .copy(file.backup, file.path, {
                  destinationBucket: "database_files",
                });
              if (restored.error)
                throw new Error("XRAG_IMPORT_RECOVERY_FAILED");
            }
          }
        }
        const finished = await supabase.rpc("finish_xrag_import_rollback", {
          p_id: id,
          p_token: nextToken,
        });
        if (finished.error) throw new Error("XRAG_IMPORT_RECOVERY_FAILED");
      },
    );
    job = await readImport(id, supabase);
  }
  // Terminal state is durable before cleanup; failed cleanup is retried by the scheduler.
  const paths = job.plan.files.flatMap((file) =>
    file.stage ? [file.stage, file.backup] : [file.backup],
  );
  for (let index = 0; index < paths.length; index += 100) {
    signal?.throwIfAborted();
    const removed = await supabase.storage
      .from(IMPORT_STAGING_BUCKET)
      .remove(paths.slice(index, index + 100));
    if (removed.error) throw new Error("XRAG_IMPORT_CLEANUP_FAILED");
  }
  if (job.state === "rolled_back" && job.plan.artifacts.length) {
    const removed = await supabase.storage
      .from(XRAG_BUCKET)
      .remove(job.plan.artifacts.map((a) => a.path));
    if (removed.error) throw new Error("XRAG_IMPORT_CLEANUP_FAILED");
  }
  if (job.plan.source)
    await deletePreparedXRAGTransfer(job.plan.source.path, { supabase });
  const saved = await supabase
    .from("xrag_import_transactions")
    .update({ cleaned_at: new Date().toISOString() })
    .eq("id", id);
  if (saved.error) throw new Error("XRAG_IMPORT_CLEANUP_FAILED");
}
