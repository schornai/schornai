import {
  MDC_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
} from "./_utils/toStorageObjectArray.ts";
import type {
  StorageFileContent,
  StorageObject,
  StorageRealtimeSession,
} from "./_types.ts";
import { diff } from "@schornio/aibox-package-markdown-changelog/diff";
import { getDocumentContent } from "./getDocumentContent.ts";
import { serializeMDC } from "@schornio/aibox-package-markdown-changelog/serialize";
import { getFileTextBackup } from "./getFileTextBackup.ts";

export async function saveDocumentContent(
  target: StorageObject,
  content: StorageFileContent,
  storageSession: StorageRealtimeSession,
  // Only updateFileText may publish/log after committing its durable backup.
  { withinTextWrite = false }: { withinTextWrite?: boolean } = {},
) {
  try {
    if (
      !withinTextWrite &&
      (await getFileTextBackup(
        storageSession.getStoragePath(target.path).storagePath,
        {
          storage: storageSession.supabaseStorage,
          signal: storageSession.abortSignal,
        },
      ))
    )
      throw new Error("TEXT_WRITE_RECOVERY_REQUIRED");
    if (content?.type === "mdc") {
      const currentContent = await getDocumentContent(
        target.path,
        storageSession,
      );

      const changes =
        currentContent?.type === "mdc"
          ? diff(currentContent.current, content.current)
          : undefined;
      const versions =
        currentContent?.type === "mdc" ? currentContent.versions : [];

      if (changes?.length !== 0) {
        const { storagePath } = storageSession.getStoragePath(
          `${target.path}${MDC_FILE_EXTENSION}`,
        );

        storageSession.abortSignal.throwIfAborted();
        const { error } = await storageSession.supabaseStorage.upload(
          storagePath,
          serializeMDC({
            current: content.current,
            versions:
              changes && versions
                ? [
                    {
                      changes,
                      date: new Date(),
                      version: (versions[0]?.version ?? 0) + 1,
                    },
                    ...versions,
                  ]
                : versions,
          }),
          { upsert: true },
        );

        if (error) throw error;
      }
    }

    if (content?.type === "transcript") {
      const { storagePath } = storageSession.getStoragePath(
        `${target.path}${TRANSCRIPT_FILE_EXTENSION}`,
      );

      storageSession.abortSignal?.throwIfAborted();
      const { error } = await storageSession.supabaseStorage.upload(
        storagePath,
        JSON.stringify(content),
        { upsert: true },
      );

      if (error) throw error;
    }

    if (!withinTextWrite)
      storageSession.logAction({
        content,
        state: "created",
        target,
      });
    return true;
  } catch (error) {
    storageSession.logAction({
      message: String(error),
      state: "error",
      target,
    });
    return false;
  }
}
