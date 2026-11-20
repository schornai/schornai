import type { XRAGOptions } from "./authentication.ts";
import { getModelExportSource } from "./getModelExportSource.ts";
import { getArtifactStream } from "./getArtifactStream.ts";
export async function getModelExport(modelId: string, options: XRAGOptions) {
  const source = await getModelExportSource(modelId, options);
  const stream = await getArtifactStream(source.path, {
    supabase: options.supabaseServiceRole,
    signal: options.signal,
  });
  return { ...source, stream };
}
