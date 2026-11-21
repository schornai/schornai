import { createResourceArchive } from "xrag/resourceArchive";
import type { XRAGResource } from "xrag/schema";
import type { XRAGOptions } from "./authentication.ts";
import { getResourceExport } from "./getResourceExport.ts";

/** Export exactly one authorized object, including repository files and their
 * text/transcription sidecars. The caller owns the private output directory. */
export async function exportResource(
  kind: XRAGResource["resourceType"],
  id: string,
  output: string,
  options: XRAGOptions,
) {
  const { resource, files } = await getResourceExport(kind, id, options);
  const result = await createResourceArchive(resource, files, output, {
    signal: options.signal,
  });
  return {
    ...result,
    resourceId: resource.id,
    name: resource.data.name as string,
  };
}
