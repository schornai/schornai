import type { AutomationOptions } from "./_types.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { z } from "zod";

export async function getAutomationRuns(
  id: string,
  { userId, claims, supabase }: AutomationOptions,
) {
  requirePlatformAccess(claims, "admin", "editor");
  const { data: owner, error: ownerError } = await supabase
    .from("automations")
    .select("id")
    .eq("id", z.uuid().parse(id))
    .eq("user_id", userId)
    .single();
  if (ownerError || !owner) throw new Error("AUTOMATION_NOT_FOUND");
  const { data, error } = await supabase
    .from("automation_runs")
    .select(
      "id, activity_id, state, event, error_code, created_at, finished_at",
    )
    .eq("automation_id", id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("AUTOMATION_READ_FAILED");
  return data;
}
