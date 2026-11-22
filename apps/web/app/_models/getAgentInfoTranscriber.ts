import { getTranscribers } from "@schornio/aibox-package-database/transcriber/getTranscribers";
import type { SupabaseClient } from "@schornio/aibox-package-database/_shared/_types";

export async function getAgentInfoTranscriber(
  identifier: string | undefined,
  supabase: SupabaseClient,
) {
  if (!identifier) return undefined;
  const transcribers = await getTranscribers({ supabase });
  const match = transcribers.find((item) => item.identifier === identifier);
  if (!match) return undefined;
  return { id: match.id, name: match.name, description: match.description };
}
