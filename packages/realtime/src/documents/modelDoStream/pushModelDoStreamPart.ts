import type { LanguageModelV4StreamPart } from "./_types.ts";
import type { Doc as YDoc } from "yjs";
import { getModelDoStream } from "./getModelDoStream.ts";

export function pushModelDoStreamPart(
  document: YDoc,
  part: LanguageModelV4StreamPart,
) {
  const { parts: messageStream } = getModelDoStream(document);

  document?.transact(() => {
    messageStream.push([part]);
  });
}
