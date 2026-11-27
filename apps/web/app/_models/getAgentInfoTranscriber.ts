import { getTranscriberInfoByIdentifier } from "@schornio/aibox-package-database/transcriber/getTranscriberInfoByIdentifier";
import type { SupabaseClient } from "@schornio/aibox-package-database/_shared/_types";

export async function getAgentInfoTranscriber(
  identifier: string | undefined,
  supabase: SupabaseClient,
) {
  if (!identifier) return undefined;
  return getTranscriberInfoByIdentifier(identifier, { supabase });
}
