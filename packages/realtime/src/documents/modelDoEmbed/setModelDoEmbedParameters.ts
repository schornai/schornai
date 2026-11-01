import type { EmbeddingModelV4DoEmbedParameters } from "./_types.ts";
import type { Doc as YDoc } from "yjs";
import { getModelDoEmbed } from "./getModelDoEmbed.ts";

export function setModelDoEmbedParameters(
  document: YDoc,
  parameters: EmbeddingModelV4DoEmbedParameters,
) {
  const { parameters: parametersYMap } = getModelDoEmbed(document);
  document.transact(() => {
    parametersYMap.setObject(parameters);
  });
}
