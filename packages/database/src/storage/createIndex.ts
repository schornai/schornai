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

async function deleteSourceByUrlThrottled(
  url: string,
  {
    abortSignal,
    supabase,
  }: { abortSignal: AbortSignal; supabase: SupabaseClient },
) {
  // We have to be careful to not delete many things at once,
  // because it quickly leads to timeouts

  const { data: sources } = await supabase
    .from("sources")
    .select()
    .abortSignal(abortSignal)
    .eq("url", url)
    .throwOnError();

  for (const source of sources) {
    let moreToDelete = true;

    while (moreToDelete) {
      const { count } = await supabase
        .from("source_objects")
        .delete({ count: "exact" })
        .abortSignal(abortSignal)
        .eq("source_id", source.id)
        .limit(100)
        .order("id")
        .throwOnError();
      moreToDelete = (count ?? 0) >= 100;
    }

    await supabase
      .from("sources")
      .delete()
      .abortSignal(abortSignal)
      .eq("id", source.id)
      .throwOnError();
  }
}

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

  await deleteSourceByUrlThrottled(url, { abortSignal, supabase });

  if (
    !documentRepository.index?.keyword?.active &&
    !documentRepository.index?.embedding?.active
  ) {
    return;
  }

  const { data: dbSource } = await supabase
    .from("sources")
    .insert({
      database_id: documentRepository.id,
      mime_type: target.type,
      name: target.name,
      url,
    })
    .abortSignal(abortSignal)
    .select()
    .single()
    .throwOnError();

  const chunks = chunk(content).map(({ content, start }) => ({
    content,
    id: crypto.randomUUID(),
    page: start,
    source_id: dbSource.id,
  }));

  const batches = toBatches(chunks, 100);

  for (const batch of batches) {
    await supabase
      .from("source_objects")
      .insert(batch)
      .abortSignal(abortSignal)
      .throwOnError();

    if (documentRepository.index?.keyword?.active) {
      await supabase
        .from("text_searches")
        .insert(
          batch.map((chunk) => ({
            database_id: documentRepository.id,
            object_id: chunk.id,
            text_search_vector: chunk.content
              .replaceAll(/[^\p{L}\p{N}_]+/gu, " ")
              .trim(),
          })),
        )
        .abortSignal(abortSignal)
        .throwOnError();
    }

    if (
      documentRepository.index?.embedding?.active &&
      documentRepository.index?.embedding?.modelIdentifier &&
      documentRepository.index?.embedding?.modelVectorSize
    ) {
      const embeddingsTable =
        `embeddings_${documentRepository.index.embedding.modelVectorSize}` as const;

      const { embeddings } = await embedMany({
        abortSignal,
        model: embeddingModel(
          documentRepository.index.embedding.modelIdentifier,
        ),
        values: batch.map((chunk) => chunk.content),
      });

      await supabase
        .from(embeddingsTable)
        .insert(
          embeddings.map((embedding, index) => ({
            database_id: documentRepository.id,
            embedding: embedding as unknown as string,
            object_id: batch[index]?.id ?? "not_set",
          })),
        )
        .abortSignal(abortSignal)
        .throwOnError();
    }
  }
}
