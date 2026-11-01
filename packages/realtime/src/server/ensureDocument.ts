import type { DocumentName } from "../_lib/DocumentName.ts";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import { ensureRealtimeDocument } from "@schornio/aibox-database/realtime/ensureRealtimeDocument";

/** Caller must authorize creation and derive userIds from the current user. */
export async function ensureDocument(
  documentName: DocumentName,
  { userIds }: { userIds: string[] },
  { supabase }: { supabase: SupabaseClient },
) {
  await ensureRealtimeDocument(documentName, { userIds }, { supabase });
}
