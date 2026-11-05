import type { SupabaseClient } from "../_shared/_types.ts";
/** Server-only coordinator persistence. Caller authorizes document access and
 * serializes writes for this document before passing a privileged client. */
export async function saveRealtimeDocument(
  documentName: string,
  state: Uint8Array,
  { supabase }: { supabase: SupabaseClient },
) {
  const { error } = await supabase
    .from("realtime_documents")
    .upsert(
      {
        document_name: documentName,
        document_data:
          "\\x" +
          Array.from(state, (byte) => byte.toString(16).padStart(2, "0")).join(
            "",
          ),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "document_name" },
    )
    .abortSignal(AbortSignal.timeout(10_000));
  if (error) throw new Error("REALTIME_DOCUMENT_SAVE_FAILED");
}
