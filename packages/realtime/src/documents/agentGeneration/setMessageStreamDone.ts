import type { Doc as YDoc } from "yjs";
import { getMessageStream } from "./getMessageStream.ts";

export function setMessageStreamDone(document: YDoc, completeCount: number) {
  const { properties } = getMessageStream(document);

  document?.transact(() => {
    properties.set("completeCount", completeCount);
    properties.set("done", true);
  });
}
