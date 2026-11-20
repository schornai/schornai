import { parseResource } from "./resource.ts";
import type { PreparedArchive } from "./preparedUpload.ts";
/** Only the fields displayed in the selection may cross the browser boundary. */
export function describeXRAGImport(
  archives: PreparedArchive[],
  digest: string,
) {
  return {
    digest,
    isCollection: archives.length !== 1 || archives[0]!.id !== digest,
    entries: archives.map((archive) => {
      const metadata = archive.xrag;
      const resource =
        metadata.xrag_type === "resource"
          ? parseResource(metadata).resource
          : undefined;
      return {
        archiveId: archive.id,
        kind: resource?.kind ?? metadata.xrag_type,
        name:
          resource?.data.name ??
          ("meta" in metadata ? metadata.meta.name : metadata.xrag_type),
        description: resource?.data.description ?? "",
        ...(resource?.data.color && { color: resource.data.color }),
        ...(resource?.data.icon && { icon: resource.data.icon }),
        needsWorkspace: !!resource,
        size: archive.size,
      };
    }),
  };
}
