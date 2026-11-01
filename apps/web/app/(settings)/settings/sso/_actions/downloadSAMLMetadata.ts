"use server";

import { serverActionClient } from "@/lib/serverActionClient";
import { saveGetSupabaseServiceRoleConfig } from "@/lib/supabase/saveGetSupabaseServiceRoleConfig";
import { getSAMLMetadata } from "@schornio/aibox-package-database/sso/getSAMLMetadata";

export const downloadSAMLMetadata = serverActionClient.action(async () => {
  const supabaseServiceRoleConfig = await saveGetSupabaseServiceRoleConfig();
  return getSAMLMetadata({ supabaseServiceRoleConfig });
});
