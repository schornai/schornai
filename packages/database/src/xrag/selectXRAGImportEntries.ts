import type { PreparedArchive } from "./preparedUpload.ts";

/** Selection uses immutable child archive digests, not editable object IDs. */
export function selectXRAGImportEntries(
  archives: PreparedArchive[],
  selected?: readonly string[],
) {
  if (!selected) return archives;
  const ids = new Set(selected);
  if (
    !ids.size ||
    ids.size !== selected.length ||
    [...ids].some((id) => !archives.some((archive) => archive.id === id))
  )
    throw new Error("XRAG_INVALID_SELECTION");
  return archives.filter((archive) => ids.has(archive.id));
}
