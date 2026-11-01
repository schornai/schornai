import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAgentById as getAgentByIdCore } from "@schornio/aibox-package-database/agent/getAgentById";

export const getAgentById = cache(async (agentId: string) => {
  const supabase = await createSupabaseServerClient();
  return getAgentByIdCore(agentId, { supabase });
});
