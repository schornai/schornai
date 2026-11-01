import type { EmbeddingModelV4DoEmbedResult } from "./_types.ts";
import type { Doc as YDoc } from "yjs";
import { getModelDoEmbed } from "./getModelDoEmbed.ts";

export function setModelDoEmbedResult(
  document: YDoc,
  result: EmbeddingModelV4DoEmbedResult,
) {
  const { result: resultYMap } = getModelDoEmbed(document);
  document.transact(() => {
    resultYMap.setObject(result);
  });
}
