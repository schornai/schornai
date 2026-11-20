"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";
import { xragFileDownloadUrl } from "@/lib/xrag/downloadUrl";
import { xragExportJobSchema } from "@schornio/aibox-package-database/xrag/cancelXRAGExport";
import { getXRAGExportDownload as operation } from "@schornio/aibox-package-database/xrag/getXRAGExportDownload";
export const getXRAGExportDownload = serverActionClient
  .inputSchema(xragExportJobSchema)
  .action(async ({ parsedInput }) => {
    const result = await operation(parsedInput, await getXRAGContext({}));
    return { url: xragFileDownloadUrl(result.url) };
  });
