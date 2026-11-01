import type {
  aiModelExternalLLMV1Schema,
  aiModelMLXWhisperV1Schema,
  aiModelOllamaEmbeddingV1Schema,
  aiModelOllamaLLMV1Schema,
} from "./_schema.ts";
import type { Database } from "../_shared/_supabase.ts";
import type { Image } from "../_shared/_types.ts";
import type z from "zod/v4";

export type AIModelRow = Database["public"]["Tables"]["ai_models"]["Row"];

type AIModelBase = {
  id: AIModelRow["id"];

  createdAt: Date; // <-- map AIModelRow['created_at'];

  name: AIModelRow["name"];
  description: AIModelRow["description"];
  image?: Image;

  identifier: AIModelRow["identifier"];
};

export type AIModelExternalLLM = z.infer<typeof aiModelExternalLLMV1Schema>;

export type AIModelLLM = AIModelBase &
  (z.infer<typeof aiModelOllamaLLMV1Schema> | AIModelExternalLLM);

export type AIModelEmbedding = AIModelBase &
  z.infer<typeof aiModelOllamaEmbeddingV1Schema>;

export type AIModelTranscription = AIModelBase &
  z.infer<typeof aiModelMLXWhisperV1Schema>;

export type AIModel = AIModelLLM | AIModelEmbedding | AIModelTranscription;
