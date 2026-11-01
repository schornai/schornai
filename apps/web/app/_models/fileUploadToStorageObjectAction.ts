import type { FileUpload } from "../_components/FileUploadProvider";
import type { StorageObjectAction } from "@schornio/aibox-package-database/storage/_types";

function fileUploadToStorageObjectActionState(
  state: FileUpload["state"],
): StorageObjectAction["state"] {
  switch (state) {
    case "error":
      return "error";
    case "uploading":
    case "queued":
      return "uploading";
    case "success": {
      return "created";
    }
  }
}

export function fileUploadToStorageObjectAction({
  file,
  path,
  progress,
  state,
}: FileUpload): StorageObjectAction | undefined {
  if (file && path) {
    return {
      progress,
      state: fileUploadToStorageObjectActionState(state),
      target: {
        createdAtISO: new Date(file.lastModified).toISOString(),
        file: true,
        name: file.name,
        path,
        size: file.size,
        type: file.type,
        updatedAtISO: new Date(file.lastModified).toISOString(),
      },
    };
  }

  return undefined;
}
