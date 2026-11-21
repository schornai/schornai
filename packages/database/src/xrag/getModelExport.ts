import { archiveWebStream } from "xrag/streamArchive";
import type { XRAGOptions } from "./authentication.ts";
import { getModelExportSource } from "./getModelExportSource.ts";
import { getArtifactStream } from "./getArtifactStream.ts";
/** Internal reader for the authorized, server-created source. Keeps both passes
 * of a collection on the same file version. */
export async function openModelExport(
  source: Awaited<ReturnType<typeof getModelExportSource>>,
  options: XRAGOptions,
) {
  return source.installed
    ? archiveWebStream(
        source.installed.read(0, source.size, options.signal),
        options.signal,
      )
    : await getArtifactStream(source.path, {
        supabase: options.supabaseServiceRole,
        signal: options.signal,
      });
}

export async function getModelExport(modelId: string, options: XRAGOptions) {
  const source = await getModelExportSource(modelId, options);
  return { ...source, stream: await openModelExport(source, options) };
}
