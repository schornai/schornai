import type { Storage } from "@schornio/aibox-database/storage/_types";
import type { UserClaims } from "@schornio/aibox-database/auth/_types";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import { getStorageTranscriber } from "@schornio/aibox-database/storage/getStorageTranscriber";
import {
  fileNeedsProcessing,
  getFileCategory,
} from "@schornio/aibox-package-utils/getFileTypeLabel";
import type { Task } from "../taskQueue/_types.ts";

// One routing decision for normal uploads and downloaded files.
export async function createStorageProcessingTask(
  parameters: {
    useSavedContent?: boolean;
    path: string;
    storage: Storage;
    userId: string;
    userClaims: UserClaims;
  },
  { supabase }: { supabase: SupabaseClient },
): Promise<
  | Extract<Task, { state: "pending"; type: "process-file" | "transcribe" }>
  | undefined
> {
  const base = {
    id: crypto.randomUUID(),
    requiredCapabilities: [],
    state: "pending" as const,
  };
  if (parameters.useSavedContent)
    return { ...base, type: "process-file", parameters };
  const processing = fileNeedsProcessing(parameters.path);
  if (processing === "transcript") {
    const transcriber = await getStorageTranscriber(parameters.storage, {
      supabase,
    });
    if (!transcriber?.modelIdentifier) return undefined;
    return {
      ...base,
      type: "transcribe",
      requiredCapabilities: [`transcriber:${transcriber.modelIdentifier}`],
      parameters: {
        ...parameters,
        modelIdentifier: transcriber.modelIdentifier,
        modelPrompt: transcriber.prompt,
        retryLevel: transcriber.retryLevel,
      },
    };
  }
  const category = getFileCategory(parameters.path);
  if (processing === "text" || category === "code" || category === "plain-text")
    return { ...base, type: "process-file", parameters };
  return undefined;
}
