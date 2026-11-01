import { getSystemConfig } from "@schornio/aibox-package-database/config/getSystemConfig";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { accessMessageSchema } from "@/lib/accessMessage";

export async function getSystemConfigAccessMessage() {
  const supabase = await saveCreateSupabaseServiceRoleClient();
  const value = await getSystemConfig("accessMessage", { supabase });
  if (!value) return {};
  try {
    return accessMessageSchema.parse(JSON.parse(value)).localized;
  } catch {
    return {};
  }
}
