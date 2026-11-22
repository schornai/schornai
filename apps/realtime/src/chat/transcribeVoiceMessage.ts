import { TranscriberConfigurationError } from "@schornio/aibox-database/transcriber/requireTranscriber";
import type { TaskTypeChat } from "@schornio/aibox-realtime/documents/taskQueue/_types";
import { createStorageProcessingTask } from "@schornio/aibox-realtime/documents/storage/createStorageProcessingTask";
import { runTask } from "@schornio/aibox-realtime/documents/taskQueue/runTask";
import { getDocumentContent } from "@schornio/aibox-database/storage/getDocumentContent";
import { StorageSession } from "@schornio/aibox-database/storage/_utils/StorageSession";
import { transcriptionToText } from "@schornio/aibox-database/storage/transcriptionToText";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";

export async function transcribeVoiceMessage(
  path: string,
  { agentId, activityId, userId, userClaims }: TaskTypeChat["parameters"],
  {
    supabase,
    ...worker
  }: { supabase: SupabaseClient } & Parameters<typeof runTask>[3],
) {
  const storage = { type: "activity" as const, activityId, agentId };
  const timeout = AbortSignal.timeout(10 * 60_000);
  const abortSignal = worker.abortSignal
    ? AbortSignal.any([worker.abortSignal, timeout])
    : timeout;
  const loadTranscript = async () => {
    const task = await createStorageProcessingTask(
      { path, storage, userId, userClaims },
      { supabase, requireTranscription: true },
    );
    if (task?.type !== "transcribe") return;
    await runTask(task.type, task.parameters, task.requiredCapabilities, {
      ...worker,
      abortSignal,
      chat: { agentId, activityId },
    });
    return getDocumentContent(
      path,
      new StorageSession({
        storage,
        supabaseStorage: supabase.storage,
        abortSignal,
      }),
    );
  };
  const result = await loadTranscript().catch((error: unknown) => {
    worker.abortSignal?.throwIfAborted();
    if (error instanceof TranscriberConfigurationError) throw error;
    if (timeout.aborted) throw new Error("VOICE_TRANSCRIPTION_TIMEOUT");
    throw new Error("VOICE_TRANSCRIPTION_FAILED");
  });
  if (result?.type !== "transcript")
    throw new Error("VOICE_TRANSCRIPTION_FAILED");
  const text = transcriptionToText(result).trim();
  if (!text) throw new Error("VOICE_NO_SPEECH");
  return text;
}
