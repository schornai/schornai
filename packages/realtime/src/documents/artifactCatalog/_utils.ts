import type { Doc } from "yjs";
import type { Artifact } from "xrag/schema";
import type { DocumentName } from "../../_lib/DocumentName.ts";

// General artifact distribution, independent of the machines consuming it.
export const artifactCatalogDocumentName = "artifactCatalog" as DocumentName;
export type ArtifactChange = {
  id: string;
  operation: "created" | "updated" | "removed";
  artifact: Artifact;
};
export const getArtifactLog = (document: Doc) =>
  document.getArray<ArtifactChange>("log");
export function addArtifactLog(document: Doc, artifact: Artifact) {
  document.transact(() => {
    const log = getArtifactLog(document);
    const existing = log
      .toArray()
      .some((entry) => entry.artifact.id === artifact.id);
    log.push([
      {
        id: crypto.randomUUID(),
        operation: artifact.deletedAt
          ? "removed"
          : existing
            ? "updated"
            : "created",
        artifact,
      },
    ]);
    if (log.length > 1000) log.delete(0, log.length - 1000);
  });
}
export function applyArtifactLog(
  artifacts: Artifact[],
  changes: ArtifactChange[],
) {
  const result = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  for (const { artifact } of changes) {
    const previous = result.get(artifact.id);
    // Immutable publication + monotonic deletion: delayed events cannot resurrect files.
    if (previous?.purgedAt || (previous?.deletedAt && !artifact.deletedAt))
      continue;
    result.set(artifact.id, artifact);
  }
  return [...result.values()].sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
}
