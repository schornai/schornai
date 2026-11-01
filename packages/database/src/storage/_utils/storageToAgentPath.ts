import type { Agent } from "../../agent/_types.ts";
import type { DocumentRepository } from "../../documentRepositories/_types.ts";
import type { Storage } from "../_types.ts";
import { agentToStoragePath } from "./agentToStoragePath.ts";
import { validateStoragePath } from "../validatePath.ts";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";

/** Reverse only paths that round-trip through the actual mount resolver (including shadowing). */
export function storageToAgentPath({
  storage,
  path,
  roles,
  repositories,
  agentId,
  activityId,
}: {
  storage: Storage;
  path: string;
  roles: Pick<Agent["roles"][number], "documentRepositoryMounts">[];
  repositories: DocumentRepository[];
  agentId: string;
  activityId: string;
}) {
  const physicalPath = validateStoragePath(path);
  if (storage.type !== "documentRepository") return undefined;
  const repository = repositories.find(
    (repo) =>
      repo.id === storage.documentRepositoryId &&
      repo.workspaceId === storage.workspaceId,
  );
  if (
    !repository ||
    !roles.length ||
    repositories.filter((repo) => repo.identifier === repository.identifier)
      .length !== 1
  )
    return undefined;
  const candidates = roles[0]!.documentRepositoryMounts.flatMap((mount) => {
    if (mount.documentRepositoryIdentifier !== repository.identifier) return [];
    const base = validateStoragePath(mount.pathRepository, { allowRoot: true });
    if (base && !physicalPath.startsWith(base + "/")) return [];
    const relative = base ? physicalPath.slice(base.length + 1) : physicalPath;
    return [resolvePath(`${mount.mount}/${relative}`)];
  });
  return candidates.find((candidate) =>
    roles.every((role) => {
      const resolved = agentToStoragePath({
        path: candidate,
        agentId,
        activityId,
        mounts: role.documentRepositoryMounts,
        mountedDocumentRepositories: repositories,
      });
      return (
        resolved?.storage.type === "documentRepository" &&
        resolved.storage.documentRepositoryId ===
          storage.documentRepositoryId &&
        resolved.storage.workspaceId === storage.workspaceId &&
        validateStoragePath(resolved.path) === physicalPath
      );
    }),
  );
}
