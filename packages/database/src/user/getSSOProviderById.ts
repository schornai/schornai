import { DANGERgetSSOProviderById } from "@/supabase/additionalEndpoints";
import { cache } from "react";
import { ensureAdmin } from "./ensureAdmin";

export const getSSOProviderById = cache(async (id: string) => {
  await ensureAdmin();
  return await DANGERgetSSOProviderById(id);
});
