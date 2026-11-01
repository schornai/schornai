import type { EmbeddingModel } from "ai";

export type EmbeddingModelV4 = Extract<
  EmbeddingModel,
  { specificationVersion: "v4" }
>;

export type EmbeddingModelV4DoEmbedParameters = Parameters<
  EmbeddingModelV4["doEmbed"]
>[0];

export type EmbeddingModelV4DoEmbedResult = Awaited<
  ReturnType<EmbeddingModelV4["doEmbed"]>
>;
