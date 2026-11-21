"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { revalidatePath } from "next/cache";
import { packageIdSchema } from "@schornio/aibox-package-database/xrag/packageSchema";
import { deleteXRAGPackage as operation } from "@schornio/aibox-package-database/xrag/deleteXRAGPackage";
export const deleteXRAGPackage = serverActionClient
  .inputSchema(packageIdSchema)
  .action(async ({ parsedInput }) => {
    await operation(parsedInput, {
      supabase: await createSupabaseServerClient(),
    });
    revalidatePath("/app/xrag/export");
  });
