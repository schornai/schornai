"use server";
import { z } from "zod";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";
import { listXRAGTransfers } from "@schornio/aibox-package-database/xrag/listXRAGTransfers";
import { inspectXRAGTransfer as inspect } from "@schornio/aibox-package-database/xrag/inspectXRAGTransfer";
export const inspectXRAGTransfer = serverActionClient
  .inputSchema(z.object({ uploadId: z.uuid() }))
  .action(async ({ parsedInput: { uploadId } }) => {
    const files = await listXRAGTransfers(
      { supabase: await createSupabaseServerClient() },
      uploadId,
    );
    if (files.length !== 1) throw new Error("XRAG_TRANSFER_NOT_FOUND");
    const { path, name } = files[0]!;
    const source = { path };
    const result = await inspect({ source }, await getXRAGContext({ source }));
    return { ...result, source: { path, name } };
  });
