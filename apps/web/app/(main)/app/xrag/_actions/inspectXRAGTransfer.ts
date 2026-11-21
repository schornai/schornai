"use server";
import { z } from "zod";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";
import { listXRAGTransfers } from "@schornio/aibox-package-database/xrag/listXRAGTransfers";
import { queueXRAGPreparation } from "@schornio/aibox-package-database/xrag/queueXRAGPreparation";
import { getPreparedXRAGImport } from "@schornio/aibox-package-database/xrag/getPreparedXRAGImport";
export const inspectXRAGTransfer = serverActionClient
  .inputSchema(z.object({ uploadId: z.uuid() }))
  .action(async ({ parsedInput: { uploadId } }) => {
    const files = await listXRAGTransfers(
      { supabase: await createSupabaseServerClient() },
      uploadId,
    );
    if (files.length !== 1) throw new Error("XRAG_TRANSFER_NOT_FOUND");
    const { path } = files[0]!;
    const source = { path };
    const context = await getXRAGContext({ source });
    const prepared = await getPreparedXRAGImport(uploadId, context);
    if (prepared) return prepared;
    await queueXRAGPreparation(source, context);
    return null;
  });
