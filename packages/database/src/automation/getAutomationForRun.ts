import type { SupabaseClient } from "../_shared/_types.ts";
import { automationTriggerSchema } from "./_schemas.ts";

/** Internal worker only; the owner must be freshly authorized before execution. */
export async function getAutomationForRun(
  id: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("AUTOMATION_READ_FAILED");
  return data
    ? { ...data, trigger: automationTriggerSchema.parse(data.trigger) }
    : null;
}
