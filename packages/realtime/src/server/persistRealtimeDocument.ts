import type { Document } from "@hocuspocus/server";
import { encodeStateAsUpdate } from "yjs";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import { saveRealtimeDocument } from "@schornio/aibox-database/realtime/saveRealtimeDocument";

/** Explicit durability before acknowledging recovery/deletion. Serialize with
 * Hocuspocus's store hook and encode the current server document under its lock. */
export async function persistRealtimeDocument(
  document: Document,
  { supabase }: { supabase: SupabaseClient },
) {
  await document.saveMutex.runExclusive(() =>
    saveRealtimeDocument(document.name, encodeStateAsUpdate(document), {
      supabase,
    }),
  );
}
