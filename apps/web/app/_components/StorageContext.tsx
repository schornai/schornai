"use client";

import {
  applyStorageLog,
  getStorageDocumentName,
} from "@schornio/aibox-realtime/documents/storage/_utils";
import type { ComponentProps } from "react";
import type { FileUpload } from "./FileUploadProvider";
import { FileUploadProvider } from "./FileUploadProvider";
import { RealtimeRoom } from "@/lib/RealtimeRoom";
import { StorageRealtimeSession } from "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { StorageViewProvider } from "./StorageViewProvider";
import { fileUploadToStorageObjectAction } from "../_models/fileUploadToStorageObjectAction";
import { getStorageLog } from "@schornio/aibox-realtime/documents/storage/getStorageLog";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { storageCreateFolders } from "../_actions/storageCreateFolders";
import { storageQueueProcessFiles } from "../_actions/storageQueueProcessFiles";
import { useHocuspocusProvider } from "@hocuspocus/provider-react";
import { useRealtimeArray } from "@/lib/useRealtimeArray";

function StorageContextProvider({
  applyNewFiles,
  beforeUpload,
  storageObjects,
  ...viewProviderProps
}: ComponentProps<typeof StorageViewProvider> & {
  applyNewFiles?: NonNullable<
    Parameters<typeof applyStorageLog>[3]
  >["newFiles"];
  beforeUpload?: (fileUploads: FileUpload[]) => void;
}) {
  const provider = useHocuspocusProvider();

  const storageLogYArray = getStorageLog(provider.document);
  const storageLog = useRealtimeArray(storageLogYArray);

  const appliedStorageObjects = applyStorageLog(
    viewProviderProps.basePathStorage,
    storageObjects,
    storageLog,
    { newFiles: applyNewFiles },
  );

  const fileStates = [
    ...new Map(
      storageLog.map(
        (entry) => [resolvePath(entry.target.path), entry.state] as const,
      ),
    ),
  ];

  const logFileUpload = (upload: FileUpload) => {
    const action = fileUploadToStorageObjectAction(upload);
    if (action) {
      StorageRealtimeSession.logAction(action, provider.document, upload.id);
    }
  };

  return (
    <FileUploadProvider
      afterUpload={async (fileUploads, { clearFinished }) => {
        const successful = fileUploads.filter(
          (upload) => upload.state === "success",
        );
        try {
          const result = await storageQueueProcessFiles({
            filePaths: successful.map((upload) => upload.path),
            storage: viewProviderProps.storage,
          });
          if (!result?.data || result.serverError || result.validationErrors) {
            throw new Error("Could not queue file processing");
          }
          // Release chat submission only after the processing job is visible to workers.
          for (const upload of successful) {
            const action = fileUploadToStorageObjectAction(upload);
            if (action)
              StorageRealtimeSession.logAction(
                result.data.skippedPaths.includes(upload.path)
                  ? action
                  : { state: "processing", target: action.target },
                provider.document,
                upload.id,
              );
          }
        } catch (error) {
          for (const upload of successful)
            logFileUpload({ ...upload, state: "error" });
          logError("StorageContextProvider", error);
        }
        if (fileUploads.every(($) => $.state === "success")) clearFinished();
      }}
      basePath={viewProviderProps.basePathStorage}
      beforeUpload={async (fileUploads) => {
        beforeUpload?.(fileUploads);
        fileUploads.forEach((fileUpload) => logFileUpload(fileUpload));

        const folderNames = Array.from(
          new Set(
            fileUploads.map(($) =>
              resolvePath($.path.split("/").slice(0, -1).join("/")),
            ),
          ),
        );
        await storageCreateFolders({
          basePath: "/",
          folderNames,
          storage: viewProviderProps.storage,
        });
      }}
      bucketName={StorageSession.getStorageName(viewProviderProps.storage.type)}
      bucketPath={
        StorageSession.getStoragePath("/", viewProviderProps.storage)
          .storagePath
      }
      onFileUploadError={logFileUpload}
      onFileUploadProgress={logFileUpload}
      onFileUploadSuccess={(upload) =>
        logFileUpload({ ...upload, state: "uploading" })
      }
    >
      <StorageViewProvider
        {...viewProviderProps}
        storageObjects={appliedStorageObjects}
        uploadingFilePaths={fileStates
          .filter(([, state]) => state === "uploading")
          .map(([path]) => path)}
        pendingFilePaths={fileStates
          .filter(
            ([, state]) => state === "uploading" || state === "processing",
          )
          .map(([path]) => path)}
      />
    </FileUploadProvider>
  );
}

export function StorageContext(
  viewProviderProps: ComponentProps<typeof StorageViewProvider> & {
    applyNewFiles?: NonNullable<
      Parameters<typeof applyStorageLog>[3]
    >["newFiles"];
    beforeUpload?: (fileUploads: FileUpload[]) => void;
  },
) {
  return (
    <RealtimeRoom name={getStorageDocumentName(viewProviderProps.storage)}>
      <StorageContextProvider {...viewProviderProps} />
    </RealtimeRoom>
  );
}
