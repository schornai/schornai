/* eslint-disable sort-keys */

import {
  THIS_CONVERSATION_MOUNT,
  agentToStoragePath,
} from "@schornio/aibox-package-database/storage/_utils/agentToStoragePath";
import type { Agent } from "@schornio/aibox-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-database/documentRepositories/_types";
import type { StorageObject } from "@schornio/aibox-package-database/storage/_types";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import type { ToolStorageList } from "@schornio/aibox-database/chat/_types";
import { list } from "@schornio/aibox-package-database/storage/list";
import { omitNullish } from "@schornio/aibox-package-utils/omitNullish";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { tool } from "ai";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";
import { z } from "zod/mini";

export function storageListTool(
  activityId: string,
  agentId: string,
  mounts: Agent["roles"][number]["documentRepositoryMounts"],
  mountedDocumentRepositories: DocumentRepository[],
  { supabase }: { supabase: SupabaseClient },
) {
  return tool({
    description:
      "Lists the contents (files and subdirectories) of a directory at the specified path. " +
      "Use this tool to explore the filesystem and discover available documents before reading them.",
    async execute(
      { path: pathInput }: ToolStorageList["input"],
      { abortSignal },
    ): Promise<ToolStorageList["output"]> {
      const path = resolvePath(pathInput);

      const storagePath = agentToStoragePath({
        activityId,
        agentId,
        mountedDocumentRepositories,
        mounts,
        path,
      });

      const mountFolders = mounts
        .map((mount) => resolvePath(mount.mount))
        .filter(
          (mount) =>
            mount.startsWith(path) &&
            !resolvePath(mount.substring(path.length)).includes("/"),
        )
        .map((mountPath) => {
          const relativePath = resolvePath(mountPath.substring(path.length));

          if (relativePath.length > 0) {
            const relativePathComponents = relativePath.split("/");
            const name = relativePathComponents.at(0);

            if (name) {
              return {
                folder: true,
                name,
                path: mountPath,
              } satisfies StorageObject;
            }
          }

          return undefined;
        })
        .filter(omitNullish);

      const systemFolders =
        path === ""
          ? [
              ...mountFolders,
              {
                folder: true,
                name: THIS_CONVERSATION_MOUNT,
                path: THIS_CONVERSATION_MOUNT,
              } satisfies StorageObject,
            ]
          : mountFolders;

      if (storagePath) {
        const { data } = await tryAsync(() =>
          list(
            storagePath.path,
            new StorageSession({
              storage: storagePath.storage,
              supabaseStorage: supabase.storage,
              abortSignal,
            }),
          ),
        );

        if (data) {
          return {
            ok: true,
            content: [
              ...data.map((storageObject) => ({
                ...storageObject,
                path: `${path}/${storageObject.name}`,
              })),
            ],
            storage: storagePath.storage,
            storageParent: {
              folder: true,
              name: storagePath.path.split("/").at(-1) ?? "",
              path: storagePath.path,
            },
          };
        }
      }

      if (systemFolders.length > 0) {
        return { ok: true, content: systemFolders };
      }

      return {
        ok: false,
        error:
          "Directory not found at the specified path or you do not have permission to access it. Please check the path and try again.",
      };
    },
    inputSchema: z.object({
      path: z
        .string()
        .check(
          z.describe(
            "The unique identifier/path of the directory content to be listed.",
          ),
        ),
    }),
  });
}
