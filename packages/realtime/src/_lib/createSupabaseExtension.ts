import { Database } from "@hocuspocus/extension-database";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";

const postgresHexToUint8Array = (src: string) =>
  new Uint8Array(
    src
      .slice(2)
      .match(/.{1,2}/g)!
      .map((byte) => parseInt(byte, 16)),
  );

const uint8ArrayToPostgresHex = (src: Uint8Array) =>
  "\\x" +
  Array.from(src)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

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

      await supabase
        .from("realtime_documents")
        .upsert(
          {
            document_data: uint8ArrayToPostgresHex(state),
            document_name: documentName,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "document_name",
          },
        )
        .throwOnError();
    },
  });
}
