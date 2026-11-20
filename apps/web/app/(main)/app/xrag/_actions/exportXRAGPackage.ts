"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";
import { revalidatePath } from "next/cache";
import { packageIdSchema } from "@schornio/aibox-package-database/xrag/packageSchema";
import { exportXRAGPackage as operation } from "@schornio/aibox-package-database/xrag/exportXRAGPackage";
export const exportXRAGPackage = serverActionClient
  .inputSchema(packageIdSchema)
  .action(async ({ parsedInput }) => {
    await operation(parsedInput, await getXRAGContext({}));
    revalidatePath("/app/xrag/export");
  });
