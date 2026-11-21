import { resolveExternalXRAGModels } from "./resolveExternalXRAGModels.ts";
import { requireImportAccess } from "./requireImportAccess.ts";
import { getXRAGClaims, type XRAGOptions } from "./authentication.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { prepareResourceImport } from "./prepareResourceImport.ts";

/** File staging and full archive authorization belong to the import coordinator.
 * Metadata is committed only after explicit confirmation of every conflict. */
export async function prepareConfirmedResourceImport(
  resources: readonly unknown[],
  target: { workspaceId: string; newWorkspaceName?: string },
  confirmedRevisions: Readonly<Record<string, string>>,
  options: XRAGOptions,
  modelSelections: Readonly<Record<string, string>> = {},
) {
  const workspaceOnly =
    resources.length === 0 && target.newWorkspaceName !== undefined;
  if (workspaceOnly)
    requirePlatformAccess(await getXRAGClaims(options), "admin", "admin");
  if (!workspaceOnly)
    requireImportAccess(
      resources,
      target.newWorkspaceName === undefined
        ? { workspaceId: target.workspaceId }
        : { newWorkspace: true },
      await getXRAGClaims(options),
    );
  const externalModels = await resolveExternalXRAGModels(
    resources,
    options,
    modelSelections,
    true,
  );
  const entries = workspaceOnly
    ? []
    : await prepareResourceImport(
        resources,
        target,
        options,
        externalModels.mappings,
      );
  for (const entry of entries) {
    if (
      entry.expectedRevision !== null &&
      confirmedRevisions[entry.originId] !== entry.expectedRevision
    )
      throw new Error("XRAG_IMPORT_CONFLICT");
    if (
      entry.expectedRevision === null &&
      confirmedRevisions[entry.originId] !== undefined
    )
      throw new Error("XRAG_IMPORT_CONFLICT");
  }
  return entries;
}
