import type { Storage } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { getAgentById } from "../agent/getAgentById.ts";
import { getDocumentRepositoryById } from "../documentRepositories/getDocumentRepositoryById.ts";
import { getTranscriberById } from "../transcriber/getTranscriberById.ts";
import { getTranscribers } from "../transcriber/getTranscribers.ts";

export async function getStorageTranscriber(
  storage: Storage,
  { supabase }: { supabase: SupabaseClient },
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
  if (typeof identifier !== "string" || !identifier) return undefined;
  const transcribers = await getTranscribers({ supabase });
  const transcriber = transcribers.find(
    (item) => item.identifier === identifier,
  );
  if (!transcriber) throw new Error("TRANSCRIBER_NOT_FOUND");
  return transcriber;
}
