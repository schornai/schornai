// "use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { Upload } from "tus-js-client";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { omitNullish } from "@schornio/aibox-package-utils/omitNullish";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { useSessionToken } from "@/lib/supabase/use-session-token";

const EXCLUDED_FILE_NAMES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

function isFile(entry: FileSystemEntry): entry is FileSystemFileEntry {
  return entry.isFile;
}

function isDirectory(
  entry: FileSystemEntry,
): entry is FileSystemDirectoryEntry {
  return entry.isDirectory;
}

type FileUploadQueued = {
  id: string;
  file: File;
  path: string;
  progress: number;
  sanitizedFileType: string;
  state: "queued";
};

type FileUploadProgress = Omit<FileUploadQueued, "state"> & {
  state: "uploading";
};

type FileUploadSuccess = Omit<FileUploadProgress, "state"> & {
  state: "success";
};

type FileUploadError = Omit<FileUploadQueued, "state"> & {
  errorMessage?: string;
  state: "error";
};

export type FileUpload =
  FileUploadQueued | FileUploadProgress | FileUploadSuccess | FileUploadError;

function sanitizeFileType(file: File) {
  if (file.type === "") {
    return "application/octet-stream";
  }

  return file.type;
}

async function fileSystemEntriesToFileUploads(
  basePath: string,
  entries: FileSystemEntry[],
) {
  const fileUploads: FileUploadQueued[] = [];
  for (const entry of entries) {
    if (isFile(entry)) {
      if (EXCLUDED_FILE_NAMES.has(entry.name)) {
        continue;
      }
      const file = await new Promise<File>((resolve, reject) =>
        entry.file(resolve, reject),
      );
      fileUploads.push({
        file,
        id: crypto.randomUUID(),
        path: resolvePath(`${basePath}/${entry.fullPath}`),
        progress: 0,
        sanitizedFileType: sanitizeFileType(file),
        state: "queued",
      });
    }

    if (isDirectory(entry)) {
      const reader = entry.createReader();
      const subEntries = await new Promise<FileSystemEntry[]>(
        (resolve, reject) => reader.readEntries(resolve, reject),
      );
      const subFileUploads = await fileSystemEntriesToFileUploads(
        basePath,
        subEntries,
      );
      fileUploads.push(...subFileUploads);
    }
  }

  return fileUploads;
}

const fileUploadContext = createContext<
  | {
      afterUpload?: (
        fileUploads: (FileUploadSuccess | FileUploadError)[],
        context: { clearErrors: () => void; clearFinished: () => void },
      ) => void | Promise<void>;
      basePath: string;
      beforeUpload?: (fileUploads: FileUploadQueued[]) => void | Promise<void>;
      bucketName: string;
      bucketPath: string;
      onFileUploadError?: (fileUpload: FileUploadError) => void;
      onFileUploadProgress?: (fileUpload: FileUploadProgress) => void;
      onFileUploadSuccess?: (fileUpload: FileUploadSuccess) => void;
      restrictUpload?: (files: File[]) => boolean;
      setUploads: Dispatch<SetStateAction<FileUpload[]>>;
      uploads: FileUpload[];
    }
  | undefined
>(undefined);

export function FileUploadProvider({
  afterUpload,
  basePath,
  beforeUpload,
  bucketName,
  bucketPath,
  children,
  onFileUploadError,
  onFileUploadProgress,
  onFileUploadSuccess,
  restrictUpload,
}: {
  afterUpload?: (
    fileUploads: (FileUploadSuccess | FileUploadError)[],
    context: { clearErrors: () => void; clearFinished: () => void },
  ) => void | Promise<void>;
  basePath: string;
  beforeUpload?: (fileUploads: FileUploadQueued[]) => void | Promise<void>;
  bucketName: string;
  bucketPath: string;
  children: ReactNode;
  onFileUploadError?: (fileUpload: FileUploadError) => void;
  onFileUploadProgress?: (fileUpload: FileUploadProgress) => void;
  onFileUploadSuccess?: (fileUpload: FileUploadSuccess) => void;
  restrictUpload?: (files: File[]) => boolean;
}) {
  const [uploads, setUploads] = useState<FileUpload[]>([]);

  const allUploadsSettled = uploads.every(
    (upload) => upload.state === "success" || upload.state === "error",
  );

  useEffect(() => {
    if (!allUploadsSettled) {
      const onBeforeUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = "";
      };

      window.addEventListener("beforeunload", onBeforeUnload);

      return () => {
        window.removeEventListener("beforeunload", onBeforeUnload);
      };
    }
    return undefined;
  }, [allUploadsSettled]);

  return (
    <fileUploadContext.Provider
      value={{
        afterUpload,
        basePath,
        beforeUpload,
        bucketName,
        bucketPath,
        onFileUploadError,
        onFileUploadProgress,
        onFileUploadSuccess,
        restrictUpload,
        setUploads,
        uploads,
      }}
    >
      {children}
    </fileUploadContext.Provider>
  );
}

export function useFileUpload() {
  const sessionToken = useSessionToken();

  const context = useContext(fileUploadContext);

  if (!context) {
    const error = new Error("useFileUpload() called outside provider");
    logError("FileUploadProvider", error);
    throw error;
  }

  const {
    afterUpload,
    basePath,
    beforeUpload,
    bucketName,
    bucketPath,
    uploads,
    setUploads,
    onFileUploadError,
    onFileUploadProgress,
    onFileUploadSuccess,
    restrictUpload,
  } = context;

  const progress =
    uploads.length === 0
      ? 0
      : uploads.reduce((prev, current) => prev + current.progress, 0) /
        uploads.length;

  const clearErrors = () => {
    setUploads((prev) =>
      prev.filter((fileUpload) => fileUpload.state !== "error"),
    );
  };

  const clearFinished = () => {
    setUploads((prev) =>
      prev.filter(
        (fileUpload) =>
          fileUpload.state !== "success" && fileUpload.state !== "error",
      ),
    );
  };

  const queueFileUploads = async (fileUploads: FileUploadQueued[]) => {
    const canUpload =
      restrictUpload?.(
        fileUploads.map(({ file }) => file).filter(omitNullish),
      ) ?? true;
    if (!canUpload) {
      return [];
    }

    setUploads((prev) => [...prev, ...fileUploads]);
    await beforeUpload?.(fileUploads);

    const upsertUploadById = (fileUpload: FileUpload) => {
      setUploads((prev) =>
        prev.map((state) => (state.id === fileUpload.id ? fileUpload : state)),
      );
    };

    const finishedFileUploads: (FileUploadSuccess | FileUploadError)[] = [];

    for (const fileUpload of fileUploads) {
      const { promise: uploadPromise, resolve: uploadResolve } =
        Promise.withResolvers();

      const objectName = resolvePath(`${bucketPath}/${fileUpload.path}`);

      const tusUpload = new Upload(fileUpload.file, {
        chunkSize: 6 * 1024 * 1024, // NOTE: it must be set to 6MB (for now) do not change it
        endpoint: "/api/storage/upload/resumable",
        headers: {
          authorization: `Bearer ${sessionToken}`,
          "x-upsert": "true",
        },
        metadata: {
          bucketName,
          cacheControl: "3600",
          contentType: fileUpload.sanitizedFileType,
          objectName,
        },
        onError(error) {
          const fileUploadError: FileUploadError = {
            ...fileUpload,
            errorMessage: String(error),
            state: "error",
          };

          upsertUploadById(fileUploadError);
          onFileUploadError?.(fileUploadError);
          finishedFileUploads.push(fileUploadError);

          logError("FileUpload", error);
          uploadResolve(undefined);
        },
        onProgress(bytesUploaded, bytesTotal) {
          const progress = bytesUploaded / bytesTotal;

          const fileUploadProgress: FileUploadProgress = {
            ...fileUpload,
            progress,
            state: "uploading",
          };

          upsertUploadById(fileUploadProgress);
          onFileUploadProgress?.(fileUploadProgress);
        },
        onSuccess() {
          const fileUploadSuccess: FileUploadSuccess = {
            ...fileUpload,
            progress: 1,
            state: "success",
          };

          upsertUploadById(fileUploadSuccess);
          onFileUploadSuccess?.(fileUploadSuccess);
          finishedFileUploads.push(fileUploadSuccess);

          uploadResolve(undefined);
        },
        removeFingerprintOnSuccess: true,
        retryDelays: [0, 3_000, 5_000, 10_000],
        uploadDataDuringCreation: true,
      });

      tusUpload.start();

      await uploadPromise;
    }

    await afterUpload?.(finishedFileUploads, { clearErrors, clearFinished });
    return finishedFileUploads;
  };

  const queueFileUploadsByDataTransfer = (dataTransfer: DataTransfer) => {
    const entries = [...dataTransfer.items]
      .map((item) => item.webkitGetAsEntry())
      .filter(omitNullish);
    fileSystemEntriesToFileUploads(basePath, entries)
      .then((fileUploads) => queueFileUploads(fileUploads))
      .catch((error) => logError("fileSystemEntriesToFileUploads", error));
  };

  const queueFileUploadsByFiles = (files: readonly File[]) => {
    const fileUploads = files.map<FileUploadQueued>((file) => ({
      file,
      id: crypto.randomUUID(),
      path: resolvePath(`${basePath}/${file.name}`),
      progress: 0,
      sanitizedFileType: sanitizeFileType(file),
      state: "queued",
    }));
    return queueFileUploads(fileUploads);
  };

  const queueFileUploadsByFileList = (fileList: FileList | null) => {
    if (!fileList) return;
    queueFileUploadsByFiles([...fileList]).catch((error) =>
      logError("queueFileUploadsByFileList", error),
    );
  };

  return {
    clearErrors,
    clearFinished,
    progress,
    queueFileUploadsByDataTransfer,
    queueFileUploadsByFileList,
    queueFileUploadsByFiles,
    uploads,
  };
}
