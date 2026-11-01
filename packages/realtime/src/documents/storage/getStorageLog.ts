import type { StorageObjectLog } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function getStorageLog(document: YDoc) {
  return document.getArray<StorageObjectLog>("log");
}
