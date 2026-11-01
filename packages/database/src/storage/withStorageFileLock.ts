import type { Storage } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { StorageSession } from "./_utils/StorageSession.ts";

/** A renewable database lease prevents concurrent workers from processing one file. */
export async function withStorageFileLock<T>(
  storage: Storage,
  path: string,
  supabase: SupabaseClient,
  signal: AbortSignal,
  operation: (signal: AbortSignal) => Promise<T>,
) {
  const args = {
    p_bucket: StorageSession.getStorageName(storage.type),
    p_path: StorageSession.getStoragePath(path, storage).storagePath,
    p_token: crypto.randomUUID(),
  };
  const acquire = () =>
    supabase
      .rpc("acquire_storage_file_lock", args)
      .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(15000)]));
  const { data, error } = await acquire();
  if (error) throw new Error("FILE_LOCK_UNAVAILABLE");
  if (!data) throw new Error("FILE_PROCESSING_IN_PROGRESS");
  const lost = new AbortController();
  let renewing: Promise<void> | undefined;
  const timer = setInterval(() => {
    if (renewing) return;
    renewing = Promise.resolve(acquire())
      .then(({ data, error }) => {
        if (error || !data) lost.abort(new Error("FILE_LOCK_LOST"));
      })
      .catch(() => lost.abort(new Error("FILE_LOCK_LOST")))
      .finally(() => {
        renewing = undefined;
      });
  }, 30000);
  try {
    return await operation(AbortSignal.any([signal, lost.signal]));
  } finally {
    clearInterval(timer);
    await renewing;
    await supabase
      .rpc("release_storage_file_lock", args)
      .abortSignal(AbortSignal.timeout(15000));
  }
}
