import type { Agent } from "../../agent/_types.ts";
import type { DocumentRepository } from "../../documentRepositories/_types.ts";
import type { Storage } from "../_types.ts";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";

export const THIS_CONVERSATION_MOUNT = "this_conversation";
export const THIS_CONVERSATION_MOUNT_PREFIX = `${THIS_CONVERSATION_MOUNT}/`;

export function agentToStoragePath({
  activityId,
  agentId,
  mountedDocumentRepositories,
  mounts,
  path,
}: {
  activityId: string;
  agentId: string;
  mountedDocumentRepositories: DocumentRepository[];
  mounts: Agent["roles"][number]["documentRepositoryMounts"];
  path: string;
}):
  | {
      path: string;
      permission: Agent["roles"][number]["documentRepositoryMounts"][number]["permission"];
      storage: Storage;
    }
  | undefined {
  path = resolvePath(path);
  if (
    path === THIS_CONVERSATION_MOUNT ||
    path.startsWith(THIS_CONVERSATION_MOUNT_PREFIX)
  ) {
    const resolvedPath = resolvePath(path.replace(THIS_CONVERSATION_MOUNT, ""));
    return {
      path: resolvedPath,
      permission: "write",
      storage: {
        activityId,
        agentId,
        type: "activity",
      },
    };
  }

  const mount = mounts
    .map((mount) => ({
      ...mount,
      mount: resolvePath(mount.mount),
      pathRepository: resolvePath(mount.pathRepository),
    }))
    .toSorted((a, b) => b.mount.localeCompare(a.mount))
    .find(
      ({ mount }) =>
        mount === "" || path === mount || path.startsWith(`${mount}/`),
    );

  if (mount) {
    const resolvedPath = resolvePath(
      `${mount.pathRepository}/${path.slice(mount.mount.length)}`,
    );

    const documentRepository = mountedDocumentRepositories.find(
      (repo) => repo.identifier === mount.documentRepositoryIdentifier,
    );

    if (documentRepository) {
      return {
        path: resolvedPath,
        permission: mount.permission,
        storage: {
          documentRepositoryId: documentRepository.id,
          type: "documentRepository",
          workspaceId: documentRepository.workspaceId,
        },
      };
    }
  }

  return undefined;
}
