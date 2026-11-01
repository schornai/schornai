import type {
  StorageObject,
  StorageRealtimeSession,
  StorageTranscription,
} from "./_types.ts";
import { TRANSCRIPT_FILE_EXTENSION } from "./_utils/toStorageObjectArray.ts";

// sollten wir das nicht umbennenen in saveDocumentTranscirapsdjv?`
export async function createDocumentTranscription(
  target: StorageObject,
  transcription: StorageTranscription,
  storageSession: StorageRealtimeSession,
) {
  const { storagePath } = storageSession.getStoragePath(
    `${target.path}${TRANSCRIPT_FILE_EXTENSION}`,
  );

  storageSession.abortSignal?.throwIfAborted();
  const { error } = await storageSession.supabaseStorage.upload(
    storagePath,
    JSON.stringify(transcription),
    { upsert: true },
  );

  if (error) throw error;

  storageSession.logAction({
    content: { ...transcription, type: "transcript" },
    state: "created",
    target,
  });
}
