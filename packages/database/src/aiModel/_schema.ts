import { z } from "zod/v4";

export const aiModelOllamaLLMV1Schema = z.object({
  config: z.object({
    contextSize: z.number().int().positive(),
    featureThinking: z.boolean(),
    featureTools: z.boolean(),
    featureVision: z.boolean(),
    ollamaIdentifier: z.string(),
  }),
  type: z.literal("ollama_llm_v1"),
});

export const aiModelOllamaEmbeddingV1Schema = z.object({
  config: z.object({
    contextSize: z.number().int().positive(),
    embeddingVectorSize: z.union([
      z.literal(384),
      z.literal(768),
      z.literal(1024),
      z.literal(1536),
    ]),
    ollamaIdentifier: z.string(),
  }),
  type: z.literal("ollama_embedding_v1"),
});

export const aiModelMLXWhisperV1Schema = z.object({
  config: z.object({
    fileSystemIdentifier: z.string(),
  }),
  type: z.literal("mlx_whisper_v1"),
});

export const externalModelProviders = [
  "mistral",
  "huggingface",
  "openai",
  "openai-azure",
  "antropic",
  "antropic-aws",
  "google",
  "openai-compatible",
] as const;
export const externalModelProviderSchema = z.enum(externalModelProviders);
export type ExternalModelProvider = z.infer<typeof externalModelProviderSchema>;

export const aiModelExternalLLMV1Schema = z.object({
  config: z.object({
    provider: externalModelProviderSchema,
    modelId: z.string().min(1),
    baseUrl: z.string(),
    region: z.string().optional(),
    headers: z.record(z.string(), z.string()).default({}),
  }),
  type: z.literal("external_llm_v1"),
});
