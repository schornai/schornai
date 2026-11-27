import type { Storage } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { getAgentById } from "../agent/getAgentById.ts";
import { getDocumentRepositoryById } from "../documentRepositories/getDocumentRepositoryById.ts";
import { getTranscriberById } from "../transcriber/getTranscriberById.ts";
import {
  requireTranscriber,
  TranscriberConfigurationError,
} from "../transcriber/requireTranscriber.ts";

export async function getStorageTranscriber(
  storage: Storage,
  {
    supabase,
    required = false,
  }: { supabase: SupabaseClient; required?: boolean },
) {
  if (storage.type === "activity-transcription")
    return getTranscriberById(storage.transcriberId, { supabase });
  const owner =
    storage.type === "activity"
      ? await getAgentById(storage.agentId, { supabase })
      : await getDocumentRepositoryById(storage.documentRepositoryId, {
          supabase,
        });
  // The transcriber integration adds this optional setting to both owners.
  const identifier =
    "transcriberIdentifier" in owner ? owner.transcriberIdentifier : undefined;
  try {
    return await requireTranscriber(
      typeof identifier === "string" ? identifier : undefined,
      { supabase },
    );
  } catch (error) {
    if (
      !required &&
      error instanceof TranscriberConfigurationError &&
      error.code !== "TRANSCRIBER_NOT_FOUND"
    )
      return undefined;
    throw error;
  }
}
