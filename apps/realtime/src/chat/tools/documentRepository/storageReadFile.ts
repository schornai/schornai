/* eslint-disable sort-keys */

import { transcriptionToText } from "@schornio/aibox-database/storage/transcriptionToText";
import type { Agent } from "@schornio/aibox-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-database/documentRepositories/_types";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import type { ToolStorageReadFile } from "@schornio/aibox-database/chat/_types";
import { agentToStoragePath } from "@schornio/aibox-package-database/storage/_utils/agentToStoragePath";
import { getDocumentContent } from "@schornio/aibox-database/storage/getDocumentContent";
import { inspect } from "@schornio/aibox-database/storage/inspect";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { tool } from "ai";
import { z } from "zod/mini";

export function storageReadFiletTool(
  activityId: string,
  agentId: string,
  mounts: Agent["roles"][number]["documentRepositoryMounts"],
  mountedDocumentRepositories: DocumentRepository[],
  { supabase }: { supabase: SupabaseClient },
) {
  return tool({
    description:
      "Extracts the raw text content of a document at a specific path. " +
      "Note: For files exceeding 10,000 characters, the output is truncated. Use the 'offset' parameter to paginate through large documents.",
    async execute(
      { offset = 0, path: pathInput }: ToolStorageReadFile["input"],
      { abortSignal },
    ): Promise<ToolStorageReadFile["output"]> {
      const path = resolvePath(pathInput);

      const storagePath = agentToStoragePath({
        activityId,
        agentId,
        mountedDocumentRepositories,
        mounts,
        path,
      });

      if (storagePath) {
        const storageSession = new StorageSession({
          storage: storagePath.storage,
          supabaseStorage: supabase.storage,
          abortSignal,
        });
        const [file, documentContent] = await Promise.all([
          inspect(storagePath.path, storageSession),
          getDocumentContent(storagePath.path, storageSession),
        ]);

        if (file?.file && !documentContent) {
          return {
            ok: false,
            error:
              "File content is unavailable. It may still be processing or processing may have failed.",
          };
        }
        const totalContent =
          documentContent?.type === "transcript"
            ? transcriptionToText(documentContent)
            : (documentContent?.current ?? "");

        const content = totalContent.substring(offset, offset + 10_000);

        if (file?.file) {
          return {
            ok: true,
            file: {
              ...file,
              path,
            },
            content,
            contentOffset: offset,
            contentLength: content.length,
            totalLength: totalContent.length,
            storage: storagePath.storage,
            storagePath: file.path,
          };
        }
      }

      return {
        ok: false,
        error:
          "File not found at the specified path or you do not have permission to access it. Please check the path and try again.",
      };
    },
    inputSchema: z.object({
      path: z
        .string()
        .check(
          z.describe("The unique identifier/path of the file to be read."),
        ),
      offset: z.optional(
        z
          .number()
          .check(
            z.describe(
              "The character position to start reading from for large files.",
            ),
          ),
      ),
    }),
  });
}
