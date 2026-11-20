"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";
import { revalidatePath } from "next/cache";
import { importTransferInputSchema } from "@schornio/aibox-package-database/xrag/transferSchema";
import { importXRAGTransfer as importArchive } from "@schornio/aibox-package-database/xrag/importXRAGTransfer";
export const importXRAG = serverActionClient
  .inputSchema(importTransferInputSchema)
  .action(async ({ parsedInput }) => {
    const context = await getXRAGContext({
      source: parsedInput.source,
      target: parsedInput.target,
    });
    const { documentFileCount } = await importArchive(parsedInput, context);
    for (const path of [
      "/",
      "/app",
      "/app/xrag/export",
      "/agent",
      "/app/documents",
      "/app/transcribe",
    ])
      revalidatePath(path);
    return { documentFileCount };
  });
