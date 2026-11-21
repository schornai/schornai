"use server";
import { redirect } from "next/navigation";
import { serverActionClient } from "@/lib/serverActionClient";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";
import { queueXRAGPreparation } from "@schornio/aibox-package-database/xrag/queueXRAGPreparation";
import { transferSourceSchema } from "@schornio/aibox-package-database/xrag/transferSchema";
export const prepareXRAGUpload = serverActionClient
  .inputSchema(transferSourceSchema)
  .action(async ({ parsedInput: source }) => {
    const { uploadId } = await queueXRAGPreparation(
      source,
      await getXRAGContext({ source }),
    );
    redirect(`/app/xrag/import/${uploadId}`);
  });
