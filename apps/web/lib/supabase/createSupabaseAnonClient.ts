import type { SupabaseDatabase } from "@schornio/aibox-package-database/_shared/_types";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";

export const createSupabaseAnonClient = cache(() => {
  const SUPABASE_URL = getEnvSafe("SUPABASE_URL");
  const SUPABASE_PUBLIC_ANON_KEY = getEnvSafe("SUPABASE_PUBLIC_ANON_KEY");

  return createClient<SupabaseDatabase>(SUPABASE_URL, SUPABASE_PUBLIC_ANON_KEY);
});
