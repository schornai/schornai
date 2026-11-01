import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";

export const saveCreateSupabaseServiceRoleClient = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const claims = await getCurrentUserClaims({ supabaseAuth: supabase.auth });

  if (claims === "admin") {
    return createSupabaseServiceRoleClient();
  }

  throw new Error("NOT_AUTHORIZED");
});
