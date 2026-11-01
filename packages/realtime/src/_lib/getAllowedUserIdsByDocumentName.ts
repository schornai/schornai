import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";

export async function getAllowedUserIdsByDocumentName(
  documentName: string,
  {
    abortSignal = new AbortController().signal,
    supabase,
  }: { abortSignal?: AbortSignal; supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("realtime_documents")
    .select("*, realtime_document_access(*)")
    .abortSignal(abortSignal)
    .eq("document_name", documentName)
    .maybeSingle()
    .throwOnError();

  return data?.realtime_document_access.map((access) => access.user_id) ?? [];
}
