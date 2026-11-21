import { identifierFileName } from "xrag/identifier";
import { getXRAGUserId, type XRAGOptions } from "./authentication.ts";
import { saveTransferExport } from "./saveTransferExport.ts";
import { streamPackageExport } from "./streamPackageExport.ts";
import type { XRAGSelection } from "./packageSchema.ts";

export async function exportXRAG(
  selection: XRAGSelection,
  options: XRAGOptions,
) {
  const userId = await getXRAGUserId(options);
  return streamPackageExport(
    selection,
    (stream, size, resourceId) =>
      saveTransferExport(
        { stream, size },
        `${selection.kind}-${identifierFileName(resourceId)}.xrag.tar`,
        userId,
        { supabase: options.supabaseServiceRole, signal: options.signal },
      ),
    options,
  );
}
