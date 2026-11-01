import type { Doc as YDoc } from "yjs";
import { getModelDoStream } from "./getModelDoStream.ts";

export function setModelDoStreamError(document: YDoc, error: unknown) {
  const { properties } = getModelDoStream(document);

  document?.transact(() => {
    properties.set("error", error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error);
  });
}
