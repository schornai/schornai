import { appColorSchema, appIconSchema } from "../_shared/_schema.ts";
import type { Database } from "../_shared/_supabase.ts";
import { automationTriggerSchema } from "./_schemas.ts";
import type { Automation } from "./_types.ts";

export function mapAutomation(
  row: Database["public"]["Tables"]["automations"]["Row"],
): Automation {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color ? appColorSchema.parse(row.color) : undefined,
    icon: row.icon ? appIconSchema.parse(row.icon) : undefined,
    agentId: row.agent_id,
    message: row.message,
    enabled: row.enabled,
    trigger: automationTriggerSchema.parse(row.trigger),
    nextRunAt: row.next_run_at,
    createdAt: row.created_at,
  };
}
