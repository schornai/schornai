"use server";
import { saveSSOAttributeMapping } from "@schornio/aibox-package-database/sso/saveSSOAttributeMapping";
import { samlMappingSchema } from "@schornio/aibox-package-database/sso/_schemas";
import { revalidatePath } from "next/cache";
import { saveGetSupabaseServiceRoleConfig } from "@/lib/supabase/saveGetSupabaseServiceRoleConfig";
import { serverActionClient } from "@/lib/serverActionClient";
export const updateSAMLAttributeMapping = serverActionClient
  .inputSchema(samlMappingSchema)
  .action(async ({ parsedInput }) => {
    await saveSSOAttributeMapping(parsedInput, {
      supabaseServiceRoleConfig: await saveGetSupabaseServiceRoleConfig(),
    });
    revalidatePath("/");
  });
