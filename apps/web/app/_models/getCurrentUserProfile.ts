import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getCurrentUserProfile as getCurrentUserProfileDatabase } from "@schornio/aibox-package-database/user/getCurrentUserProfile";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export const getCurrentUserProfile = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await tryAsync(() =>
    getCurrentUserProfileDatabase({ supabase }),
  );
  return data;
});
