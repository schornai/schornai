/* eslint-disable sort-keys */

import type { Agent } from "@schornio/aibox-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-database/documentRepositories/_types";
import type { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { StorageRealtimeSession } from "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import type { ToolApprovalStatus } from "ai";
import type { ToolStorageWriteFile } from "@schornio/aibox-database/chat/_types";
import { agentToStoragePath } from "@schornio/aibox-package-database/storage/_utils/agentToStoragePath";
import { createFile } from "@schornio/aibox-database/storage/createFile";
import { inspect } from "@schornio/aibox-database/storage/inspect";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { saveDocumentContent } from "@schornio/aibox-package-database/storage/saveDocumentContent";
import { tool } from "ai";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";
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
  }: {
    serverToken: `Worker ${string}`;
    supabase: SupabaseClient;
    websocketProvider: ServerRealtimeWebsocketProvider;
  },
) {
  return tool({
    description:
      "Writes text content to a file at a specific path. " +
      "If the file already exists, its content will be overwritten. " +
      "If the file does not exist, it will be created automatically.",
    async execute(
      { content, path: pathInput }: ToolStorageWriteFile["input"],
      { abortSignal },
    ): Promise<ToolStorageWriteFile["output"]> {
      const path = resolvePath(pathInput);

      const storagePath = agentToStoragePath({
        activityId,
        agentId,
        mountedDocumentRepositories,
        mounts,
        path,
      });

      if (storagePath && storagePath.permission !== "read-only") {
        await using storageSession = new StorageRealtimeSession({
          abortSignal,
          serverToken,
          storage: storagePath.storage,
          supabaseStorage: supabase.storage,
          websocketProvider,
        });

        const file =
          (await tryAsync(() => inspect(storagePath.path, storageSession)))
            .data ??
          (await createFile(
            new Blob([content]),
            storagePath.path,
            storageSession,
          ));

        if (file.folder) {
          return {
            ok: false,
            error: "The specified path is a folder.",
          };
        }

        await saveDocumentContent(
          file,
          { current: content, type: "mdc", versions: [] },
          storageSession,
        );

        return {
          ok: true,
          file,
          storage: storagePath.storage,
          storagePath: storagePath.path,
        };
      }

      return {
        ok: false,
        error:
          "The specified path is invalid or you do not have permission to write to this location. Please check the path and try again.",
      };
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
