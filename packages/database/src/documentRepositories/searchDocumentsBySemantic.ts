import type { AIModelEmbedding } from "../aiModel/_types.ts";
import type { DocumentRepositorySearchResult } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { fileNeedsProcessing } from "@schornio/aibox-package-utils/getFileTypeLabel";

export async function searchDocumentsBySemantic(
  embedding: number[],
  embeddingVectorSize: AIModelEmbedding["config"]["embeddingVectorSize"],
  documentRepositoryId: string,
  options: {
    abortSignal: AbortSignal;
    limit?: number;
    skip?: number;
    supabase: SupabaseClient;
    threshold?: number;
  },
): Promise<DocumentRepositorySearchResult[]> {
  const param_limit = options?.limit ?? 5;
  const param_offset = options?.skip ?? 0;
  const param_threshold = options?.threshold ?? 0;

  const query = {
    param_database_id: documentRepositoryId,
    param_embedding: embedding as unknown as string,
    param_limit,
    param_offset,
    param_threshold,
  };

  const rpcName = `match_embeddings_${embeddingVectorSize}_v2` as const;

  const { data: matches, error: errorMatches } = await options.supabase
    .rpc(rpcName, query)
    .abortSignal(options.abortSignal);

  if (errorMatches) {
    throw new Error(undefined, errorMatches);
  }

  const objectIds = matches.map(($) => String($.object_id));

  const { data } = await options.supabase
    .from("source_objects")
    .select("*, sources(*)")
    .abortSignal(options.abortSignal)
    .in("id", objectIds)
    .throwOnError();

  const dataWithEmbeddingDistance = data.map(($) => ({
    digest: $.content,
    digestOffset: $.page ?? 0,

    embeddingDistance: Number(
      matches.find(($1) => $1.object_id === $.id)?.product ?? 0,
    ),

    file: {
      createdAtISO: new Date($.sources.created_at).toISOString(),
      file: true as const,
      name: $.sources.name,
      path: $.sources.url.split("/").slice(3).join("/"),
      readableContent: fileNeedsProcessing($.sources.url),
      size: 0,
      type: $.sources.mime_type,
      updatedAtISO: new Date($.sources.created_at).toISOString(),
    },
  }));

  dataWithEmbeddingDistance.sort(
    (a, b) => a.embeddingDistance - b.embeddingDistance,
  );

  return dataWithEmbeddingDistance;
}
