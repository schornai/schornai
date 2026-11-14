import type { Automation, AutomationOptions } from "./_types.ts";
import { mapAutomation } from "./_mappers.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";

export async function getAutomations({
  userId,
  claims,
  supabase,
}: AutomationOptions): Promise<Automation[]> {
  requirePlatformAccess(claims, "admin", "editor");
  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("AUTOMATION_READ_FAILED");
  return (data ?? []).map(mapAutomation);
}
