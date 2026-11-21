"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { revalidatePath } from "next/cache";
import { packageItemSchema } from "@schornio/aibox-package-database/xrag/packageSchema";
import { removeXRAGPackageItem as operation } from "@schornio/aibox-package-database/xrag/removeXRAGPackageItem";
export const removeXRAGPackageItem = serverActionClient
  .inputSchema(packageItemSchema)
  .action(async ({ parsedInput }) => {
    await operation(parsedInput, {
      supabase: await createSupabaseServerClient(),
    });
    revalidatePath("/app/xrag/export");
  });
