import type { DocumentRepositorySearchResult } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { fileNeedsProcessing } from "@schornio/aibox-package-utils/getFileTypeLabel";
import { omitNullish } from "@schornio/aibox-package-utils/omitNullish";

export async function searchDocumentsByKeywords(
  keywords: string,
  documentRepositoryId: string,
  options: {
    abortSignal: AbortSignal;
    limit?: number;
    skip?: number;
    supabase: SupabaseClient;
  },
): Promise<DocumentRepositorySearchResult[]> {
  const from = options?.skip ?? 0;
  const to = from + (options?.limit ?? 5) - 1;

  const { data } = await options.supabase
    .from("text_searches_with_sources")
    .select("*, source_objects(*, sources(*))")
    .abortSignal(options.abortSignal)
    .eq("database_id", documentRepositoryId)
    .textSearch("text_search_vector", keywords)
    .range(from, to)
    .throwOnError();

  return (
    data
      ?.map(($) => $.source_objects)
      .filter(omitNullish)
      .map(($) => ({
        digest: $.content,
        digestOffset: $.page ?? 0,
        file: {
          createdAtISO: new Date($.sources.created_at).toISOString(),
          file: true,
          name: $.sources.name,
          path: $.sources.url.split("/").slice(3).join("/"),
          readableContent: fileNeedsProcessing($.sources.url),
          size: 0,
          type: $.sources.mime_type,
          updatedAtISO: new Date($.sources.created_at).toISOString(),
        },
      })) ?? []
  );
}
