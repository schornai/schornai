import type {
  EmbeddingModelV4DoEmbedParameters,
  EmbeddingModelV4DoEmbedResult,
} from "./_types.ts";
import { TypedYMap } from "../../_lib/TypedYMap.ts";
import type { Doc as YDoc } from "yjs";

export function getModelDoEmbed(document: YDoc) {
  const parameters = new TypedYMap<EmbeddingModelV4DoEmbedParameters>(
    document.getMap("parameters"),
  );
  const result = new TypedYMap<EmbeddingModelV4DoEmbedResult>(
    document.getMap("result"),
  );

  return { parameters, result };
}
