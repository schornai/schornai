import type { Doc as YDoc } from "yjs";
import { getMessageStream } from "./getMessageStream.ts";

export function setMessageStreamError(document: YDoc, error: unknown) {
  const { properties } = getMessageStream(document);

  document?.transact(() => {
    properties.set("error", error);
  });
}
