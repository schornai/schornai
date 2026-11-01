"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { serverActionClient } from "@/lib/serverActionClient";

export const signOut = serverActionClient.action(async () => {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
});
