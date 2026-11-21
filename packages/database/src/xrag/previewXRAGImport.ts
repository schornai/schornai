import { selectXRAGImportEntries } from "./selectXRAGImportEntries.ts";
import {
  requireImportAccess,
  requireXRAGArchiveAccess,
} from "./requireImportAccess.ts";
import { resolveExternalXRAGModels } from "./resolveExternalXRAGModels.ts";
import type { XRAGOptions } from "./authentication.ts";
import { prepareXRAGTransfer } from "./prepareXRAGTransfer.ts";
import { getXRAGClaims } from "./authentication.ts";
import { prepareResourceImport } from "./prepareResourceImport.ts";
import { importPreviewInputSchema } from "./transferSchema.ts";
import type { z } from "zod";

export async function previewXRAGImport(
  input: z.infer<typeof importPreviewInputSchema>,
  options: XRAGOptions,
) {
  const { source, target, selectedEntries } =
    importPreviewInputSchema.parse(input);
  const { entries: allArchives, digest } = await prepareXRAGTransfer(
    source,
    options,
  );

  const claims = await getXRAGClaims(options);
  requireXRAGArchiveAccess(
    allArchives.map((archive) => archive.xrag),
    claims,
  );
  const archives = selectXRAGImportEntries(allArchives, selectedEntries);
  requireImportAccess(
    archives.map((archive) => archive.xrag),
    target
      ? target.newWorkspaceName === undefined
        ? { workspaceId: target.workspaceId }
        : { newWorkspace: true }
      : undefined,
    claims,
  );
  const resources = archives.filter(
    (archive) => archive.xrag.xrag_type === "resource",
  );
  const externalModels = await resolveExternalXRAGModels(
    resources.map((archive) => archive.xrag),
    options,
  );
  const plan = resources.length
    ? await prepareResourceImport(
        resources.map((archive) => archive.xrag),
        target!,
        options,
        externalModels.mappings,
      )
    : [];
  return {
    digest,
    externalModels: externalModels.choices,
    entries: archives.map((archive) => {
      const metadata = archive.xrag;
      const entry =
        metadata.xrag_type === "resource"
          ? plan.find((item) => item.originId === metadata.id)
          : undefined;
      return {
        id: entry?.originId ?? archive.id,
        kind: entry?.kind ?? archive.xrag.xrag_type,
        name:
          entry?.name ??
          ("meta" in archive.xrag
            ? archive.xrag.meta.name
            : archive.xrag.xrag_type),
        size: archive.size,
        revision: entry?.expectedRevision ?? null,
      };
    }),
  };
}
