import type { StorageObjectLog } from "./_types.ts";
import type { Doc as YDoc } from "yjs";
import { getStorageLog } from "./getStorageLog.ts";

export function addStorageLog(
  document: YDoc,
  logItem: Omit<StorageObjectLog, "id">,
) {
  document?.transact(() => {
    const logYArray = getStorageLog(document);
    const logArray = logYArray.toArray();

    const logItemIndex = logArray.findIndex(
      ($) =>
        $.target.path === logItem.target.path &&
        $.sessionId === logItem.sessionId,
    );
    const oldLogItem = logArray[logItemIndex];
    const newLogItem = {
      ...logItem,
      id: oldLogItem?.id ?? crypto.randomUUID(),
    } as StorageObjectLog;

    if (oldLogItem) {
      logYArray.delete(logItemIndex, 1);
      logYArray.insert(logItemIndex, [newLogItem]);
    } else {
      logYArray.push([newLogItem]);
    }
  });
}
