"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { revalidatePath } from "next/cache";
import { addXRAGPackageItemSchema } from "@schornio/aibox-package-database/xrag/packageSchema";
import { addXRAGPackageItem as operation } from "@schornio/aibox-package-database/xrag/addXRAGPackageItem";
export const addXRAGPackageItem = serverActionClient
  .inputSchema(addXRAGPackageItemSchema)
  .action(async ({ parsedInput }) => {
    await operation(parsedInput, {
      supabase: await createSupabaseServerClient(),
    });
    revalidatePath("/app/xrag/export");
  });
