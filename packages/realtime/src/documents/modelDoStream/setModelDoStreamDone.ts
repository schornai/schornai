import type { Doc as YDoc } from "yjs";
import { getModelDoStream } from "./getModelDoStream.ts";

export function setModelDoStreamDone(document: YDoc, completeCount: number) {
  const { properties } = getModelDoStream(document);

  document?.transact(() => {
    properties.set("completeCount", completeCount);
    properties.set("done", true);
  });
}
