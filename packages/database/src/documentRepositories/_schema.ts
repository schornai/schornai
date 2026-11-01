import { appColorSchema, appIconSchema } from "../_shared/_schema.ts";
import { z } from "zod/mini";

export const embeddingVectorSizeSchema = z.union([
  z.literal(384),
  z.literal(768),
  z.literal(1024),
  z.literal(1536),
]);

const legacyDatabaseEmbeddingModelSchema = z.union([
  z.object({
    embeddingVectorSize: embeddingVectorSizeSchema,
    id: z.string(),
    identifier: z.string(),
    type: z.literal("ollama-embedding-model"),
  }),
  z.object({
    id: z.string(),
    type: z.literal("ollama-embedding-model-v2"),
  }),
]);

const legacyDatabaseTextFileConfigSchema = z.object({
  embedding: z.optional(
    z.object({
      model: legacyDatabaseEmbeddingModelSchema,
    }),
  ),
  keyword: z.optional(z.unknown()),
  type: z.literal("text-files"),
});

export const documentRepositoryConfigSchema = z.object({
  color: z.optional(appColorSchema),
  icon: z.optional(appIconSchema),
  identifier: z.string(),
  index: z.optional(
    z.object({
      embedding: z.optional(
        z.object({
          active: z.boolean(),
          modelIdentifier: z.optional(z.string()),
          modelVectorSize: z.optional(embeddingVectorSizeSchema),
        }),
      ),
      keyword: z.optional(
        z.object({
          active: z.boolean(),
        }),
      ),
    }),
  ),
  transcriberIdentifier: z.optional(z.string()),
  type: z.literal("database-v2"),
});

export const documentRepositorySchema = z.intersection(
  z.object({
    description: z.string(),
    id: z.string(),
    name: z.string(),
    workspaceId: z.string(),
  }),
  documentRepositoryConfigSchema,
);

export const documentRepositoryConfigWithLegacySupportSchema = z.union([
  documentRepositoryConfigSchema,
  legacyDatabaseTextFileConfigSchema,
]);
