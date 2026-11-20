import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getXRAGUserId } from "./authentication.ts";
import { saveTransferExport } from "./saveTransferExport.ts";
import type { XRAGSelection } from "./packageSchema.ts";
import { writeXRAGExport } from "./writeXRAGExport.ts";
import type { XRAGOptions } from "./authentication.ts";
export async function exportXRAG(
  selection: XRAGSelection,
  options: XRAGOptions,
) {
  const userId = await getXRAGUserId(options);
  const directory = await mkdtemp(join(tmpdir(), "xrag-export-"));
  try {
    const output = await writeXRAGExport(selection, directory, options);
    return await saveTransferExport(output.path, output.name, userId, {
      supabase: options.supabaseServiceRole,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
