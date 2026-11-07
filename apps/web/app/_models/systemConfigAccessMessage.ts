import { getSystemConfig } from "@schornio/aibox-package-database/config/getSystemConfig";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { parseAccessMessageTemplates } from "@/lib/accessMessage";

export async function getSystemConfigAccessMessage() {
  const supabase = await saveCreateSupabaseServiceRoleClient();
  const value = await getSystemConfig("accessMessage", { supabase });
  return parseAccessMessageTemplates(value);
}
