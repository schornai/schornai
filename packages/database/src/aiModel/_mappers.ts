import type { AIModel, AIModelRow } from "./_types.ts";
import type { Image } from "../_shared/_types.ts";

export function mapAIModel(dbAIModel: AIModelRow): AIModel {
  const model = {
    config: dbAIModel.config,
    createdAt: new Date(dbAIModel.created_at),
    description: dbAIModel.description,
    id: dbAIModel.id,
    identifier: dbAIModel.identifier,
    image: (dbAIModel.image ?? undefined) as Image | undefined,
    name: dbAIModel.name,
    type: dbAIModel.type,
  } as AIModel;

  if (model.type === "ollama_llm_v1" || model.type === "ollama_embedding_v1") {
    model.identifier = model.config.ollamaIdentifier;
  }

  return model;
}
