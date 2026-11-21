import { z } from "zod";
import { transferSourceSchema } from "./transferSchema.ts";
import type { XRAGOptions } from "./authentication.ts";
import { prepareXRAGTransfer } from "./prepareXRAGTransfer.ts";
import { getXRAGClaims } from "./authentication.ts";
import { requireXRAGArchiveAccess } from "./requireImportAccess.ts";
import { describeXRAGImport } from "./describeXRAGImport.ts";

export const inspectXRAGTransferSchema = z.object({
  source: transferSourceSchema,
});
/** Read sanitized display metadata without requiring a destination workspace. */
export async function inspectXRAGTransfer(
  input: z.infer<typeof inspectXRAGTransferSchema>,
  options: XRAGOptions,
) {
  const { source } = inspectXRAGTransferSchema.parse(input);
  const { entries: archives, digest } = await prepareXRAGTransfer(
    source,
    options,
  );

  requireXRAGArchiveAccess(
    archives.map((archive) => archive.xrag),
    await getXRAGClaims(options),
  );
  return describeXRAGImport(archives, digest);
}
