import type { DocumentRepository } from "../documentRepositories/_types.ts";
import type { EmbeddingModel } from "ai";
import type { StorageFileObject } from "./_types.ts";
import type { StorageSession } from "./_utils/StorageSession.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { embedMany } from "ai";

function chunk(value: string, options = { padding: 50, size: 500 }) {
  const coreSize = options.size - 2 * options.padding;
  const chunks: { content: string; start: number }[] = [];

  for (
    let offset = options.padding;
    offset < value.length + options.padding;
    offset += coreSize
  ) {
    const start = Math.max(0, offset - options.padding);
    const end = Math.min(value.length, offset + coreSize + options.padding);
    chunks.push({ content: value.substring(start, end), start });
  }

  return chunks;
}

function toBatches<T>(chunks: T[], batchSize: number): T[][] {
  const batches = [];
  for (let index = 0; index < chunks.length; index += batchSize) {
    batches.push(chunks.slice(index, index + batchSize));
  }
  return batches;
}

/** Caller must authorize write access and hold the storage file lease. */
export async function createIndex(
  target: StorageFileObject,
  content: string,
  documentRepository: DocumentRepository,
  storageSession: StorageSession,
  {
    abortSignal = new AbortController().signal,
    embeddingModel,
    supabase,
  }: {
    abortSignal?: AbortSignal;
    embeddingModel: (modelId: string) => EmbeddingModel;
    supabase: SupabaseClient;
  },
) {
  const url = `database_files/${storageSession.getStoragePath(target.path).storagePath}`;

  const keyword = documentRepository.index?.keyword?.active ?? false;
  const embedding = documentRepository.index?.embedding?.active
    ? documentRepository.index.embedding
    : undefined;
  if (embedding && (!embedding.modelIdentifier || !embedding.modelVectorSize))
    throw new Error("INVALID_EMBEDDING_CONFIGURATION");
  const chunks: {
    content: string;
    page: number;
    searchText: string;
    embedding?: number[];
  }[] =
    keyword || embedding
      ? chunk(content).map(({ content, start }) => ({
          content,
          page: start,
          searchText: content.replaceAll(/[^\p{L}\p{N}_]+/gu, " ").trim(),
        }))
      : [];
  // Prepare every external result first. Failed batches leave the published index intact.
  if (embedding) {
    for (const batch of toBatches(chunks, 100)) {
      abortSignal.throwIfAborted();
      const { embeddings } = await embedMany({
        abortSignal,
        model: embeddingModel(embedding.modelIdentifier!),
        values: batch.map((chunk) => chunk.content),
      });
      if (
        embeddings.length !== batch.length ||
        embeddings.some(
          (vector) =>
            vector.length !== embedding.modelVectorSize ||
            vector.some((value) => !Number.isFinite(value)),
        )
      )
        throw new Error("INVALID_FILE_EMBEDDINGS");
      batch.forEach((chunk, index) => {
        chunk.embedding = embeddings[index]!;
      });
    }
  }
  abortSignal.throwIfAborted();
  // Source, chunks, keywords and vectors must commit together, including deletion of the old index.
  await supabase
    .rpc("replace_file_index", {
      p_repository_id: documentRepository.id,
      p_url: url,
      p_name: target.name,
      p_mime_type: target.type,
      p_keyword: keyword,
      p_embedding_dimension: embedding?.modelVectorSize ?? 0,
      p_chunks: chunks,
    })
    .abortSignal(abortSignal)
    .throwOnError();
}
