import type { DocumentDatabaseIdentifier } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { getDocumentDatabaseById } from "./getDocumentDatabaseById.ts";
import { getDocumentPath } from "./_utils.ts";

type IndexParams = [
  filePath: string,
  database: DocumentDatabaseIdentifier,
  { supabase: SupabaseClient },
];

async function getEmbeddingIndex(
  objectId: string[],
  vectorSize: unknown,
  { supabase }: { supabase: SupabaseClient },
) {
  if (vectorSize === undefined) {
    return undefined;
  }

  switch (vectorSize) {
    case 384: {
      const { data } = await supabase
        .from("embeddings_384")
        .select()
        .in("object_id", objectId.slice(0, 100))
        .throwOnError();
      return data;
    }
    case 768: {
      const { data } = await supabase
        .from("embeddings_768")
        .select()
        .in("object_id", objectId.slice(0, 100))
        .throwOnError();
      return data;
    }
    case 1024: {
      const { data } = await supabase
        .from("embeddings_1024")
        .select()
        .in("object_id", objectId.slice(0, 100))
        .throwOnError();
      return data;
    }
    case 1536: {
      const { data } = await supabase
        .from("embeddings_1536")
        .select()
        .in("object_id", objectId.slice(0, 100))
        .throwOnError();
      return data;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  throw new Error(`Invalid vector size: "${String(vectorSize)}"`);
}

export async function getIndexSample(
  ...[filePath, database, { supabase }]: IndexParams
) {
  // const [filePaht, database, { supabase}] = getIndexParams
  const url = getDocumentPath(filePath, database);

  const [{ data: dbSource }, documentDatabase] = await Promise.all([
    supabase
      .from("sources")
      .select("*, source_objects(*, text_searches(*))")
      .eq("url", url)
      .maybeSingle()
      .throwOnError(),
    getDocumentDatabaseById(database.databaseId, { supabase }),
  ]);

  if (!dbSource) {
    return undefined;
  }

  const dbEmbeddingIndex = await getEmbeddingIndex(
    dbSource.source_objects.map((dbSourceObject) => dbSourceObject.id),
    documentDatabase.embeddingIndex?.embeddingModel.config.embeddingVectorSize,
    { supabase },
  );

  const indexContent: {
    content: string;
    embeddingIndex?: unknown;
    id: string;
    keywordIndex?: unknown;
  }[] = [];

  for (const dbSourceObject of dbSource.source_objects) {
    indexContent.push({
      content: dbSourceObject.content,
      embeddingIndex:
        dbEmbeddingIndex?.find((idx) => idx.object_id === dbSourceObject.id)
          ?.embedding ?? undefined,
      id: dbSourceObject.id,
      keywordIndex: dbSourceObject.text_searches[0]?.text_search_vector,
    });
  }

  return indexContent;
}
