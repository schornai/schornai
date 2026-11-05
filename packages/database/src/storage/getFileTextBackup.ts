import type { SupabaseStorageAPI } from "../_shared/_types.ts";
import { MDC_FILE_EXTENSION } from "./_utils/toStorageObjectArray.ts";
import {
  decodeBlob,
  readTextWriteJournal,
} from "./_utils/textWriteRecovery.ts";

/** Read through the caller's authorized bucket client. Paths are full bucket paths. */
export async function getFileTextBackup(
  path: string,
  { storage, signal }: { storage: SupabaseStorageAPI; signal: AbortSignal },
) {
  const sidecar = path.endsWith(MDC_FILE_EXTENSION);
  const original = sidecar ? path.slice(0, -MDC_FILE_EXTENSION.length) : path;
  const journal = await readTextWriteJournal(original, storage, signal);
  if (!journal) return undefined;
  const backup = sidecar ? journal.sidecar : journal.original;
  // A missing old sidecar is different from an absent journal.
  return { blob: backup ? decodeBlob(backup) : undefined };
}
