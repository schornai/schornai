import type { Agent } from "@schornio/aibox-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-database/documentRepositories/_types";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import type { ToolStorageTransferFile } from "@schornio/aibox-database/chat/_types";
import type { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { agentToStoragePath } from "@schornio/aibox-database/storage/_utils/agentToStoragePath";
import { validateStoragePath } from "@schornio/aibox-database/storage/validatePath";
import { transferStorageFile } from "@schornio/aibox-realtime/documents/storage/transferStorageFile";
import { tool, type ToolApprovalStatus } from "ai";
import { z } from "zod/mini";
type Context = {
  activityId: string;
  agentId: string;
  mounts: Agent["roles"][number]["documentRepositoryMounts"];
  mountedDocumentRepositories: DocumentRepository[];
};
function resolve(input: ToolStorageTransferFile["input"], context: Context) {
  // Validate before normalization so ../ cannot escape the requested mount.
  validateStoragePath(input.fromPath);
  validateStoragePath(input.toPath);
  const source = agentToStoragePath({ ...context, path: input.fromPath });
  const target = agentToStoragePath({ ...context, path: input.toPath });
  if (!source || !target) throw new Error("INVALID_MOUNT");
  return { source, target };
}
export function storageTransferFileToolApproval(
  move: boolean,
  context: Context,
) {
  return (input: ToolStorageTransferFile["input"]): ToolApprovalStatus => {
    try {
      const { source, target } = resolve(input, context);
      if (
        target.permission === "read-only" ||
        (move && source.permission === "read-only")
      )
        return "denied";
      if (
        target.permission === "confirm-write" ||
        (move && source.permission === "confirm-write")
      )
        return "user-approval";
      return "approved";
    } catch {
      return "denied";
    }
  };
}
export function storageTransferFileTool(
  move: boolean,
  context: Context,
  options: {
    supabase: SupabaseClient;
    authenticatedUser?: Parameters<
      typeof transferStorageFile
    >[1]["authenticatedUser"];
    serverToken: `Worker ${string}`;
    websocketProvider: ServerRealtimeWebsocketProvider;
  },
) {
  return tool({
    description: `${move ? "Move" : "Copy"} one file including extracted text and corrected transcripts between mounted repositories or this_conversation. Both paths include the filename; missing target folders are created automatically, including nested folders. Never overwrites existing files. Transferring entire directories and changing file extensions are unsupported. Copy requires source read and target write access; move also requires source write access. Target indexing is queued using preserved content. An ok result with processing=error means the file transfer succeeded: report the indexing issue, do not repeat the transfer.`,
    inputSchema: z.object({
      fromPath: z
        .string()
        .check(
          z.describe("Source filename in the agent's mounted filesystem."),
        ),
      toPath: z
        .string()
        .check(
          z.describe(
            "Full destination path including the filename in the mounted filesystem. Missing parent folders are created automatically.",
          ),
        ),
    }),
    execute: async (
      input: ToolStorageTransferFile["input"],
      { abortSignal },
    ): Promise<ToolStorageTransferFile["output"]> => {
      try {
        const { source, target } = resolve(input, context);
        if (storageTransferFileToolApproval(move, context)(input) === "denied")
          return {
            ok: false,
            error: "The mount does not allow this transfer.",
          };
        const parts = target.path.split("/");
        const name = parts.pop();
        const result = await transferStorageFile(
          {
            from: { storage: source.storage, path: source.path },
            to: { storage: target.storage, folder: parts.join("/"), name },
            move,
          },
          { ...options, abortSignal },
        );
        return { ok: true, ...result, storagePath: result.file.path };
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        const messages: Record<string, string> = {
          FILE_ALREADY_EXISTS:
            "A destination file or derived file already exists. Nothing was overwritten.",
          TARGET_FOLDER_IS_FILE:
            "A file occupies part of the destination folder path. Choose a different folder path.",
          SOURCE_EQUALS_TARGET: "Source and destination are identical.",
          FILE_PROCESSING_IN_PROGRESS:
            "A file is being processed; wait before retrying.",
          SOURCE_CHANGED_DURING_COPY:
            "The source changed during copying; the incomplete destination was rolled back.",
          COPIED_SOURCE_DELETE_FAILED:
            "The complete destination exists, but source deletion failed. Inspect both locations before retrying.",
          COPY_FAILED_TARGET_CLEANUP_REQUIRED:
            "Copying failed and destination cleanup was incomplete. The source was retained; inspect the destination before retrying.",
        };
        return {
          ok: false,
          error:
            messages[code] ??
            "Transfer failed. Check source and destination permissions, filenames and destination path before retrying.",
        };
      }
    },
  });
}
