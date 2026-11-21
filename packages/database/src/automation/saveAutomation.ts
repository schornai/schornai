import { automationInputSchema, type AutomationInput } from "./_schemas.ts";
import type { AutomationOptions } from "./_types.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { getAgentById } from "../agent/getAgentById.ts";
import { requireStorageAccess } from "../storage/requireStorageAccess.ts";
import { StorageSession } from "../storage/_utils/StorageSession.ts";
import { nextAutomationTime } from "./nextAutomationTime.ts";

export async function saveAutomation(
  input: AutomationInput,
  options: AutomationOptions,
) {
  const value = automationInputSchema.parse(input);
  const { userId, claims, supabase, supabaseServiceRole } = options;
  const agent = await getAgentById(value.agentId, { supabase });
  requirePlatformAccess(
    claims,
    options.level ?? "admin",
    "editor",
    agent.workspaceId,
  );
  let bucket: string | null = null;
  let prefix: string | null = null;
  if (value.trigger.type === "storage") {
    await requireStorageAccess(value.trigger.storage, "read", { supabase });
    bucket = StorageSession.getStorageName(value.trigger.storage.type);
    prefix =
      StorageSession.getStoragePath(
        "",
        value.trigger.storage,
      ).storagePath.replace(/\/$/, "") + "/";
  }
  const nextRunAt =
    value.enabled && value.trigger.type === "time"
      ? (nextAutomationTime(
          value.trigger.schedule,
          new Date(),
        )?.toISOString() ?? null)
      : null;
  if (value.enabled && value.trigger.type === "time" && !nextRunAt)
    throw new Error("AUTOMATION_DATE_PAST");
  const row = {
    access_level: options.level ?? "admin",
    user_id: userId,
    agent_id: value.agentId,
    name: value.name,
    description: value.description ?? "",
    color: value.color ?? null,
    icon: value.icon ?? null,
    message: value.message,
    enabled: value.enabled,
    trigger: value.trigger,
    storage_bucket: bucket,
    storage_prefix: prefix,
    next_run_at: nextRunAt,
    revision: crypto.randomUUID(),
    updated_at: new Date().toISOString(),
  };
  const query = value.id
    ? supabaseServiceRole
        .from("automations")
        .update(row)
        .eq("id", value.id)
        .eq("user_id", userId)
    : supabaseServiceRole.from("automations").insert(row);
  const { data, error } = await query.select("id").single();
  if (error || !data) throw new Error("AUTOMATION_SAVE_FAILED");
  return { id: data.id };
}
