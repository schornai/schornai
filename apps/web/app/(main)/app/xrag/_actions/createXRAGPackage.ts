"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { revalidatePath } from "next/cache";
import { createXRAGPackageSchema } from "@schornio/aibox-package-database/xrag/createXRAGPackage";
import { createXRAGPackage as operation } from "@schornio/aibox-package-database/xrag/createXRAGPackage";
export const createXRAGPackage = serverActionClient
  .inputSchema(createXRAGPackageSchema)
  .action(async ({ parsedInput }) => {
    await operation(parsedInput, {
      supabase: await createSupabaseServerClient(),
    });
    revalidatePath("/app/xrag/export");
  });
