"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";
import { importPreviewInputSchema } from "@schornio/aibox-package-database/xrag/transferSchema";
import { previewXRAGImport as preview } from "@schornio/aibox-package-database/xrag/previewXRAGImport";
export const previewXRAGImport = serverActionClient
  .inputSchema(importPreviewInputSchema)
  .action(async ({ parsedInput }) =>
    preview(
      parsedInput,
      await getXRAGContext({
        source: parsedInput.source,
        target: parsedInput.target,
      }),
    ),
  );
