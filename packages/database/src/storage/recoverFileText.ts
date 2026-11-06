import type { StorageSession } from "./_utils/StorageSession.ts";
import {
  readTextWriteJournal,
  restoreTextWriteJournal,
} from "./_utils/textWriteRecovery.ts";

/** Caller must authorize write access and hold the original file's lease. */
export async function recoverFileText(path: string, session: StorageSession) {
  const { storagePath } = session.getStoragePath(path);
  const journal = await readTextWriteJournal(
    storagePath,
    session.supabaseStorage,
    session.abortSignal,
  );
  if (journal)
    await restoreTextWriteJournal(
      storagePath,
      journal,
      session.supabaseStorage,
      session.abortSignal,
    );
}
