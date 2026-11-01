import type { Database } from "../_shared/_supabase.ts";
import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient(config?: {
  environmentKeys?: {
    supabaseKey?: string;
    supabaseUrl?: string;
  };
}) {
  const supabaseUrlEnvKey =
    config?.environmentKeys?.supabaseUrl ?? "SUPABASE_URL";
  const supabaseUrl = process.env[supabaseUrlEnvKey];
  if (!supabaseUrl || supabaseUrl.length === 0) {
    throw new Error(`Environment variable "${supabaseUrlEnvKey}" not set.`);
  }

  const supabaseKeyEnvKey =
    config?.environmentKeys?.supabaseKey ?? "SUPABASE_ANON_KEY";
  const supabaseKey = process.env[supabaseKeyEnvKey];
  if (!supabaseKey || supabaseKey.length === 0) {
    throw new Error(`Environment variable "${supabaseKeyEnvKey}" not set.`);
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
}
