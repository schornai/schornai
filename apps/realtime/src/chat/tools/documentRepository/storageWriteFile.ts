/* eslint-disable sort-keys */

import type { Agent } from "@schornio/aibox-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-database/documentRepositories/_types";
import type { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { writeStorageFileText } from "@schornio/aibox-realtime/documents/storage/writeStorageFileText";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import type { ToolApprovalStatus } from "ai";
import type { ToolStorageWriteFile } from "@schornio/aibox-database/chat/_types";
import { agentToStoragePath } from "@schornio/aibox-package-database/storage/_utils/agentToStoragePath";
import { validateStoragePath } from "@schornio/aibox-database/storage/validatePath";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { tool } from "ai";
import { z } from "zod/mini";

export function storageWriteFileTool(
  activityId: string,
  agentId: string,
  mounts: Agent["roles"][number]["documentRepositoryMounts"],
  mountedDocumentRepositories: DocumentRepository[],
  {
    serverToken,
    supabase,
    websocketProvider,
    authenticatedUser,
  }: {
    serverToken: `Worker ${string}`;
    supabase: SupabaseClient;
    authenticatedUser?: Parameters<
      typeof writeStorageFileText
    >[1]["authenticatedUser"];
    websocketProvider: ServerRealtimeWebsocketProvider;
  },
) {
  return tool({
    description:
      "Writes UTF-8 text (up to 1 MiB) under the file lock. Existing text/code originals and their processed text are updated together; new text/code files are created automatically. For other existing formats, only previously extracted text or transcription is edited; the binary original is preserved. Repository indexing is queued from the saved text. If an error says the file was saved but indexing failed, retry the same content.",
    async execute(
      { content, path: pathInput }: ToolStorageWriteFile["input"],
      { abortSignal },
    ): Promise<ToolStorageWriteFile["output"]> {
      try {
        validateStoragePath(pathInput);
        const storagePath = agentToStoragePath({
          activityId,
          agentId,
          mountedDocumentRepositories,
          mounts,
          path: resolvePath(pathInput),
        });
        if (!storagePath || storagePath.permission === "read-only")
          return {
            ok: false,
            error:
              "The specified path is invalid or you do not have permission to write to this location.",
          };
        const result = await writeStorageFileText(
          {
            storage: storagePath.storage,
            path: storagePath.path,
            text: content,
            createIfMissing: true,
          },
          {
            supabase,
            authenticatedUser,
            serverToken,
            websocketProvider,
            abortSignal,
          },
        );
        if (result.status === "recoveryRequired")
          return {
            ok: false,
            error:
              "Saving was interrupted. The previous version remains available; retry writing the same content to recover.",
          };
        if (result.status !== "saved")
          return {
            ok: false,
            error:
              "The file changed before it could be saved. Read it again before retrying.",
          };
        if (!result.indexQueued)
          return {
            ok: false,
            error:
              "The file was saved, but its search index could not be queued. Retry writing the same content.",
          };
        return {
          ok: true,
          file: result.file,
          storage: storagePath.storage,
          storagePath: storagePath.path,
        };
      } catch (error) {
        const messages: Record<string, string> = {
          TARGET_IS_FOLDER: "The specified path is a folder.",
          TARGET_FOLDER_IS_FILE:
            "A file occupies part of the destination folder path.",
          UNSUPPORTED_NEW_TEXT_FILE:
            "New files must have a supported text or code extension, such as .txt, .md or .json.",
          FILE_NOT_EDITABLE:
            "This file has no editable extracted text. Process it before editing its text.",
          TEXT_FILE_TOO_LARGE: "The text exceeds the 1 MiB UTF-8 limit.",
          FILE_PROCESSING_IN_PROGRESS:
            "The file is being processed or edited. Wait before retrying.",
        };
        return {
          ok: false,
          error:
            messages[error instanceof Error ? error.message : ""] ??
            "The file content could not be saved.",
        };
      }
    },
    inputSchema: z.object({
      content: z
        .string()
        .check(z.describe("The full text content to be written to the file.")),
      path: z
        .string()
        .check(
          z.describe(
            "The destination path/filename where the content should be saved.",
          ),
        ),
    }),
  });
}

export function storageWriteFileToolApproval(
  activityId: string,
  agentId: string,
  mounts: Agent["roles"][number]["documentRepositoryMounts"],
  mountedDocumentRepositories: DocumentRepository[],
) {
  return ({
    path: pathInput,
  }: ToolStorageWriteFile["input"]): ToolApprovalStatus => {
    try {
      validateStoragePath(pathInput);
    } catch {
      return "denied";
    }
    const path = resolvePath(pathInput);

    const storagePath = agentToStoragePath({
      activityId,
      agentId,
      mountedDocumentRepositories,
      mounts,
      path,
    });

    switch (storagePath?.permission) {
      case "confirm-write":
        return "user-approval";
      case "read-only":
        return "denied";
      case "write":
        return "approved";
    }

    return "not-applicable";
  };
}
