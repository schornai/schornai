import "server-only";

import type { ServiceRoleConfig } from "@schornio/aibox-package-database/sso/_types";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";

export const saveGetSupabaseServiceRoleConfig = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const claims = await getCurrentUserClaims({ supabaseAuth: supabase.auth });

  if (claims === "admin") {
    const SUPABASE_URL = getEnvSafe("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = getEnvSafe("SUPABASE_SERVICE_ROLE_KEY");

    return {
      supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: SUPABASE_URL,
    } satisfies ServiceRoleConfig;
  }

  throw new Error("NOT_AUTHORIZED");
});
