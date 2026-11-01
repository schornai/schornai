import "server-only";

import type { SupabaseDatabase } from "@schornio/aibox-package-database/_shared/_types";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";

export const createSupabaseServiceRoleClient = cache(() => {
  const SUPABASE_URL = getEnvSafe("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = getEnvSafe("SUPABASE_SERVICE_ROLE_KEY");

  return createClient<SupabaseDatabase>(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
});
