"use server";
import { redirect } from "next/navigation";
import { serverActionClient } from "@/lib/serverActionClient";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";
import { prepareXRAGTransfer } from "@schornio/aibox-package-database/xrag/prepareXRAGTransfer";
import { transferSourceSchema } from "@schornio/aibox-package-database/xrag/transferSchema";
export const prepareXRAGUpload = serverActionClient
  .inputSchema(transferSourceSchema)
  .action(async ({ parsedInput: source }) => {
    const prepared = await prepareXRAGTransfer(
      source,
      await getXRAGContext({ source }),
    );
    redirect(`/app/xrag/import/${prepared.id}`);
  });
