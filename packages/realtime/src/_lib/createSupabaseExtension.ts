import { saveRealtimeDocument } from "@schornio/aibox-database/realtime/saveRealtimeDocument";
import { Database } from "@hocuspocus/extension-database";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";

const postgresHexToUint8Array = (src: string) =>
  new Uint8Array(
    src
      .slice(2)
      .match(/.{1,2}/g)!
      .map((byte) => parseInt(byte, 16)),
  );

// warum ist das in diesem ordner?
export function createSupabaseExtension({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  return new Database({
    async fetch({ documentName }) {
      //todo: is persistent document?
      // jetzt nur mal für storage ... hardcoded
      // (black,statt whitelist)
      if (
        documentName.startsWith("storage___") ||
        documentName.startsWith("model_do_stream__") ||
        documentName.startsWith("embeddings__")
      ) {
        return null;
      }

      const { data, error } = await supabase
        .from("realtime_documents")
        .select()
        .eq("document_name", documentName)
        .maybeSingle();

      if (error) {
        // eslint-disable-next-line no-console
        console.error("error", error);
        throw error;
      }

      const documentData = data?.document_data;

      if (!documentData) {
        return null;
      }

      return postgresHexToUint8Array(documentData);
    },
    async store({ documentName, state }) {
      //todo: is persistent document?
      // jetzt nur mal für storage hardcoded
      // (black,statt whitelist)
      if (
        documentName.startsWith("storage___") ||
        documentName.startsWith("model_do_stream__") ||
        documentName.startsWith("embeddings__")
      ) {
        return;
      }

      await saveRealtimeDocument(documentName, state, { supabase });
    },
  });
}
