import type { Storage } from "@schornio/aibox-database/storage/_types";
import type { StorageObjectLog, StorageRealtimeObject } from "./_types.ts";
import type { DocumentName } from "../../_lib/DocumentName.ts";
import { ExhaustiveError } from "@schornio/aibox-package-utils/ExhaustiveError";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";

export function getStorageDocumentName(storage: Storage) {
  switch (storage.type) {
    case "activity":
    case "activity-transcription":
      return `storage___activity_${storage.activityId}` as DocumentName;
    case "documentRepository":
      return `storage___repo_${storage.workspaceId}_${storage.documentRepositoryId}` as DocumentName;
    default:
      throw new ExhaustiveError(storage);
  }
}

export function applyStorageLog(
  currentFolderPath: string,
  storageObjects: StorageRealtimeObject[],
  storageLog: StorageObjectLog[],
  options?: { newFiles?: "addToLog" | "ignore" },
) {
  const resolvedCurrentFolderPath = resolvePath(currentFolderPath);
  const appliedStorageObjects: StorageRealtimeObject[] = [...storageObjects];
  for (const logEntry of storageLog) {
    const prefix = resolvedCurrentFolderPath
      ? `${resolvedCurrentFolderPath}/`
      : "";
    if (logEntry.target.path.startsWith(prefix)) {
      const [objectName, ...additionalSegments] = logEntry.target.path
        .substring(prefix.length)
        .split("/");

      if (!objectName) {
        continue;
      }

      if (additionalSegments.length > 0) {
        continue;
      }

      const targetIndex = appliedStorageObjects.findIndex(
        (obj) => !obj.attachment && logEntry.target.path === obj.path,
      );

      const logEntryRealtimeTarget: StorageRealtimeObject = {
        ...logEntry.target,
        currentAction: logEntry,
      };

      switch (logEntry.state) {
        case "created":
        case "processing":
        case "uploading": {
          if (targetIndex === -1) {
            if ((options?.newFiles ?? "addToLog") === "addToLog") {
              appliedStorageObjects.push(logEntryRealtimeTarget);
            }
          } else {
            appliedStorageObjects[targetIndex] = logEntryRealtimeTarget;
          }
          break;
        }
        case "error": {
          if (targetIndex >= 0) {
            appliedStorageObjects[targetIndex] = logEntryRealtimeTarget;
          }
          break;
        }
        case "removed": {
          if (targetIndex >= 0) {
            appliedStorageObjects.splice(targetIndex, 1);
          }
          break;
        }
      }
    }
  }

  return appliedStorageObjects;
}
