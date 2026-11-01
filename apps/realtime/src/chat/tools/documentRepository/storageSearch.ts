/* eslint-disable sort-keys */

import type {
  ToolStorageSearch,
  ToolStorageSearchResult,
} from "@schornio/aibox-database/chat/_types";
import type { Agent } from "@schornio/aibox-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-database/documentRepositories/_types";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import { aiboxModelEmbedding } from "@schornio/aibox-realtime/_lib/aiboxModelEmbedding";
import { omitNullish } from "@schornio/aibox-package-utils/omitNullish";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { searchDocuments } from "@schornio/aibox-database/documentRepositories/searchDocuments";
import { tool } from "ai";
import { z } from "zod/mini";
import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";

export function storageSearchTool(
  mounts: Agent["roles"][number]["documentRepositoryMounts"],
  mountedDocumentRepositories: DocumentRepository[],
  { supabase }: { supabase: SupabaseClient },
) {
  return tool({
    description:
      "Searches through mounted document repositories for files matching the provided keywords or semantic context. " +
      "Returns a list of relevant documents with their paths, relevance scores, and metadata. Useful for discovering available content before reading or processing files.",
    async execute(
      { keywords }: ToolStorageSearch["input"],
      { abortSignal, messages },
    ): Promise<ToolStorageSearch["output"]> {
      const lastUserMessage = messages
        .filter((message) => message.role === "user")
        .map((message) =>
          Array.isArray(message.content)
            ? message.content
                .filter((part) => part.type === "text")
                .map((textPart) => textPart.text)
                .join("\n")
            : message.content,
        )
        .at(-1);

      const websocketProvider = new ServerRealtimeWebsocketProvider();

      const results = await Promise.all(
        mountedDocumentRepositories.map(async (documentRepository) => {
          const { documentsByKeywords, documentsBySemantic } =
            await searchDocuments(
              documentRepository,
              {
                keywords,
                semantic: lastUserMessage ?? keywords?.join(", "),
              },
              {
                supabase,
                abortSignal,
                embeddingModel: (modelId) =>
                  aiboxModelEmbedding(modelId, {
                    serverToken: getRealtimeServerToken(),
                    websocketProvider,
                  }),
              },
            );

          const result: ToolStorageSearchResult[] = [
            ...documentsByKeywords,
            ...documentsBySemantic,
          ]
            .map((result) => {
              const mount = mounts.find(
                (mount) =>
                  mount.documentRepositoryIdentifier ===
                    documentRepository.identifier &&
                  (resolvePath(mount.pathRepository) === "" ||
                    result.file.path === resolvePath(mount.pathRepository) ||
                    result.file.path.startsWith(
                      `${resolvePath(mount.pathRepository)}/`,
                    )),
              );

              if (!mount) {
                return undefined;
              }

              return {
                ...result,
                file: {
                  ...result.file,
                  path: resolvePath(
                    result.file.path.replace(
                      resolvePath(mount?.pathRepository),
                      `${mount?.mount}/`,
                    ),
                  ),
                },
                storage: {
                  documentRepositoryId: documentRepository.id,
                  workspaceId: documentRepository.workspaceId,
                  type: "documentRepository",
                },
                storagePath: result.file.path,
              } satisfies ToolStorageSearchResult;
            })
            .filter(omitNullish);
          return result;
        }),
      );

      return {
        ok: true,
        content: results.flat(),
      };
    },
    inputSchema: z.object({
      keywords: z
        .array(z.string())
        .check(
          z.describe(
            "An array of search terms or queries to find relevant files and directories in the mounted storage.",
          ),
        ),
    }),
  });
}
