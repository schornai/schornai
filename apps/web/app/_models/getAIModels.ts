import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAIModels as getAIModelsCore } from "@schornio/aibox-package-database/aiModel/getAIModels";

export const getAIModels = cache(async () => {
  const supabase = await createSupabaseServerClient();
  return await getAIModelsCore({ supabase });
});
