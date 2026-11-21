import { z } from "zod";
import {
  automationRunInputSchema,
  automationTriggerSchema,
} from "./_schemas.ts";
import type { AutomationOptions } from "./_types.ts";
import { getAgentById } from "../agent/getAgentById.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { requireStorageAccess } from "../storage/requireStorageAccess.ts";
import { validateAutomationFilePath } from "./validateAutomationFilePath.ts";
import { StorageSession } from "../storage/_utils/StorageSession.ts";
import { inspect } from "../storage/inspect.ts";

/** Authenticate the caller before supplying options. Only the caller's own
 * persisted definition can be run; the service RPC atomically creates its job. */
export async function runAutomationNow(
  input: z.infer<typeof automationRunInputSchema>,
  options: AutomationOptions,
) {
  const value = automationRunInputSchema.parse(input);
  const { data: automation, error } = await options.supabase
    .from("automations")
    .select("*")
    .eq("id", value.id)
    .eq("user_id", options.userId)
    .maybeSingle();
  if (error || !automation) throw new Error("AUTOMATION_NOT_FOUND");
  const agent = await getAgentById(automation.agent_id, {
    supabase: options.supabase,
  });
  requirePlatformAccess(
    options.claims,
    options.level ?? "admin",
    "editor",
    agent.workspaceId,
  );
  const trigger = automationTriggerSchema.parse(automation.trigger);
  let path = "";
  if (trigger.type === "storage") {
    await requireStorageAccess(trigger.storage, "read", {
      supabase: options.supabase,
    });
    if (trigger.attachment !== "none") {
      path = validateAutomationFilePath(value.path ?? "", trigger);
      const session = new StorageSession({
        storage: trigger.storage,
        supabaseStorage: options.supabase.storage,
      });
      if (!(await inspect(path, session))?.file)
        throw new Error("AUTOMATION_FILE_REQUIRED");
    }
  }
  const levels = ["user", "editor", "workspace", "admin"];
  const level =
    levels[
      Math.min(
        levels.indexOf(options.level ?? "admin"),
        levels.indexOf(automation.access_level),
      )
    ]!;
  const { data, error: enqueueError } = await options.supabaseServiceRole.rpc(
    "enqueue_automation_manual",
    {
      p_id: value.id,
      p_user_id: options.userId,
      p_revision: automation.revision,
      p_request_id: value.requestId,
      p_event: { type: "manual", path, accessLevel: level },
    },
  );
  if (enqueueError || !data) throw new Error("AUTOMATION_RUN_FAILED");
  return { id: data };
}
