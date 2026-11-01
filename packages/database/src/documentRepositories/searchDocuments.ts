import type { DocumentRepository } from "./_types.ts";
import type { EmbeddingModel } from "ai";
import type { SupabaseClient } from "../_shared/_types.ts";
import { embed } from "ai";
import { searchDocumentsByKeywords } from "./searchDocumentsByKeywords.ts";
import { searchDocumentsBySemantic } from "./searchDocumentsBySemantic.ts";

export async function searchDocuments(
  documentRepository: DocumentRepository,
  query: {
    keywords?: string[];
    semantic?: string;
  },
  options: {
    abortSignal?: AbortSignal;
    embeddingModel?: (modelId: string) => EmbeddingModel;
    limit?: number;
    skip?: number;
    supabase: SupabaseClient;
  },
) {
  const abortSignal = options.abortSignal ?? new AbortController().signal;
  const [documentsByKeywords, documentsBySemantic] = await Promise.all([
    (async () => {
      if (!documentRepository.index?.keyword?.active || !query.keywords)
        return [];

      const keywords = query.keywords
        .map((keyword) => keyword.replaceAll("'", "\\'").trim())
        .filter((keyword) => keyword.length > 0);

      const keywordQuery = keywords
        .map((keyword) => `'${keyword}'`)
        .join(" | ");

      return await searchDocumentsByKeywords(
        keywordQuery,
        documentRepository.id,
        {
          abortSignal,
          limit: options.limit,
          skip: options.skip,
          supabase: options.supabase,
        },
      );
    })(),
    (async () => {
      const embeddingModel = options.embeddingModel;
      if (
        !embeddingModel ||
        !documentRepository.index?.embedding?.active ||
        !documentRepository.index?.embedding?.modelIdentifier ||
        !documentRepository.index?.embedding?.modelVectorSize ||
        !query.semantic
      ) {
        return [];
      }

      const { embedding } = await embed({
        model: embeddingModel(
          documentRepository.index.embedding.modelIdentifier,
        ),
        value: query.semantic,
      });

      return await searchDocumentsBySemantic(
        embedding,
        documentRepository.index.embedding.modelVectorSize,
        documentRepository.id,
        {
          abortSignal,
          limit: options.limit,
          skip: options.skip,
          supabase: options.supabase,
        },
      );
    })(),
  ]);

  return { documentsByKeywords, documentsBySemantic };
}
