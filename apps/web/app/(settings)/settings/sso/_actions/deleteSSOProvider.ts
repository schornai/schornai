"use server";

import { deleteSSOProvider as deleteSSOProviderDatabase } from "@schornio/aibox-package-database/sso/deleteSSOProvider";
import { revalidatePath } from "next/cache";
import { saveGetSupabaseServiceRoleConfig } from "@/lib/supabase/saveGetSupabaseServiceRoleConfig";
import { serverActionClient } from "@/lib/serverActionClient";

export const deleteSSOProvider = serverActionClient.action(async () => {
  const supabaseServiceRoleConfig = await saveGetSupabaseServiceRoleConfig();

  await deleteSSOProviderDatabase({ supabaseServiceRoleConfig });

  revalidatePath("/");
});
