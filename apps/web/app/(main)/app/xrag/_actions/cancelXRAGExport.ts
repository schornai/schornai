"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";
import { revalidatePath } from "next/cache";
import { xragExportJobSchema } from "@schornio/aibox-package-database/xrag/cancelXRAGExport";
import { cancelXRAGExport as operation } from "@schornio/aibox-package-database/xrag/cancelXRAGExport";
export const cancelXRAGExport = serverActionClient
  .inputSchema(xragExportJobSchema)
  .action(async ({ parsedInput }) => {
    await operation(parsedInput, await getXRAGContext({}));
    revalidatePath("/app/xrag/export");
  });
