import type { DatabaseRow, DocumentRepository } from "./_types.ts";
import {
  documentRepositoryConfigSchema,
  documentRepositoryConfigWithLegacySupportSchema,
} from "./_schema.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { getAIModelById } from "../aiModel/getAIModelById.ts";
import type { z } from "zod/mini";

export function mapDocumentRepository(row: DatabaseRow): DocumentRepository {
  const config = documentRepositoryConfigSchema.parse(row.config);

  return {
    color: config.color,
    description: row.description,
    icon: config.icon,
    id: row.id,
    identifier: config.identifier ?? row.id,
    index: config.index,
    name: row.name,
    transcriberIdentifier: config.transcriberIdentifier,
    type: "database-v2",
    workspaceId: row.organization_id ?? "not_set",
  };
}

export async function mapDocumentRepositoryWithLegacySupportCleanUp(
  row: DatabaseRow,
  {
    supabase,
  }: {
    supabase: SupabaseClient;
  },
): Promise<DocumentRepository> {
  const { data: config } =
    documentRepositoryConfigWithLegacySupportSchema.safeParse(row.config);

  if (config?.type === "database-v2") {
    return mapDocumentRepository(row);
  }

  // Legacy support
  // This may surface mcp-endpoints as text-databases but they are not widely in use AFAIK

  const embeddingModel = config?.embedding
    ? await getAIModelById(config.embedding.model.id, { supabase })
    : undefined;

  const newConfig: z.infer<typeof documentRepositoryConfigSchema> = {
    identifier: row.id,
    index: {
      embedding:
        embeddingModel?.type === "ollama_embedding_v1"
          ? {
              active: true,
              modelIdentifier: embeddingModel.config.ollamaIdentifier,
              modelVectorSize:
                "embeddingVectorSize" in embeddingModel.config
                  ? embeddingModel.config.embeddingVectorSize
                  : 768,
            }
          : undefined,
      keyword: config?.keyword ? { active: true } : undefined,
    },
    type: "database-v2",
  };

  // da gibts noch ein problem - alle index sind empty
  // await supabase
  //   .from("databases")
  //   .update({ config: newConfig })
  //   .eq("id", row.id)
  //   .throwOnError();

  return {
    description: row.description,
    id: row.id,
    identifier: newConfig.identifier,
    index: newConfig.index,
    name: row.name,
    transcriberIdentifier: newConfig.transcriberIdentifier,
    type: "database-v2",
    workspaceId: row.organization_id ?? "not_set",
  };
}
