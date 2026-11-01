import { DANGERgetSSOProviders } from "../_util/supabaseAdditionalEndpoints";
import type { SupabaseClient } from "../_shared/_types";
import { ensureAdmin } from "./ensureAdmin";

export async function getSSOProviders({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  await ensureAdmin({ supabase });
  return await DANGERgetSSOProviders();
}
