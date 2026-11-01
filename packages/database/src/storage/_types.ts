import type { storageSchema, transcriptionSchema } from "./_schemas.ts";
import type { StorageSession } from "./_utils/StorageSession.ts";
import type { fileNeedsProcessing } from "@schornio/aibox-package-utils/getFileTypeLabel";
import type { getDocumentContent } from "./getDocumentContent.ts";
import type { z } from "zod/mini";

export type Storage = z.infer<typeof storageSchema>;

export type StorageObjectReadableContent = "text" | "transcript";

type StorageObjectBase = { name: string; path: string };

export type StorageFileObject = StorageObjectBase & {
  createdAtISO: string;
  file: true;
  folder?: undefined;
  readableContent?: ReturnType<typeof fileNeedsProcessing>;
  size: number;
  type: string;
  updatedAtISO: string;
};

export type StorageFolderObject = StorageObjectBase & {
  file?: undefined;
  folder: true;
};

export type StorageObject = StorageFileObject | StorageFolderObject;

export type StorageObjectAction = { target: StorageObject } & (
  | {
      progress: number;
      state: "uploading";
    }
  | {
      state: "processing";
    }
  | {
      content?: StorageFileContent;
      // files created by the system
      // or files uploaded
      // or after rich-text-extraction, transcription
      state: "created";
    }
  | { state: "removed" }
  | {
      message?: string;
      state: "error";
    }
);

export type StorageRealtimeSession = StorageSession & {
  logAction(target: StorageObjectAction): void;
};

export type StorageFileContent = Awaited<ReturnType<typeof getDocumentContent>>;

export type StorageTranscription = z.infer<typeof transcriptionSchema>;
