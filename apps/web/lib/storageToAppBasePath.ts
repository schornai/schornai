import type { Storage } from "@schornio/aibox-package-database/storage/_types";

export function storageToAppBasePath(storage?: Storage) {
  switch (storage?.type) {
    case "activity":
      return `/agent/${storage.agentId}/${storage.activityId}/files`;
    case "activity-transcription":
      return `/app/transcribe/${storage.transcriberId}/${storage.activityId}/files`;
    case "documentRepository":
      return `/app/documents/${storage.documentRepositoryId}/files`;
  }

  return undefined;
}
