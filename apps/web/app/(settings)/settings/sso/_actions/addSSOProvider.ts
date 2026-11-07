"use server";
import { createSSOSettings } from "@schornio/aibox-package-database/sso/createSSOSettings";
import { ssoProviderInputSchema } from "@schornio/aibox-package-database/sso/_schemas";
import { revalidatePath } from "next/cache";
import { saveGetSupabaseServiceRoleConfig } from "@/lib/supabase/saveGetSupabaseServiceRoleConfig";
import { serverActionClient } from "@/lib/serverActionClient";
export const addSSOProvider = serverActionClient
  .inputSchema(ssoProviderInputSchema)
  .action(async ({ parsedInput }) => {
    await createSSOSettings(parsedInput, {
      supabaseServiceRoleConfig: await saveGetSupabaseServiceRoleConfig(),
    });
    revalidatePath("/");
  });
