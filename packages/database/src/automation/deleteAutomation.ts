import type { AutomationOptions } from "./_types.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { z } from "zod";

export async function deleteAutomation(
  id: string,
  { userId, claims, supabaseServiceRole }: AutomationOptions,
) {
  requirePlatformAccess(claims, "admin", "editor");
  const { data, error } = await supabaseServiceRole
    .from("automations")
    .delete()
    .eq("id", z.uuid().parse(id))
    .eq("user_id", userId)
    .select("id")
    .single();
  if (error || !data) throw new Error("AUTOMATION_DELETE_FAILED");
  return { id: data.id };
}
