import type { SupabaseClient } from "../_shared/_types.ts";
import { automationTriggerSchema } from "./_schemas.ts";
import { getAutomationOwner } from "./getAutomationOwner.ts";
import { createClientWithClaims } from "../auth/createClientWithClaims.ts";
import { requireStorageAccess } from "../storage/requireStorageAccess.ts";
import { StorageSession } from "../storage/_utils/StorageSession.ts";
import { getDocumentContent } from "../storage/getDocumentContent.ts";
import { inspect } from "../storage/inspect.ts";
import { fileNeedsProcessing } from "@schornio/aibox-package-utils/getFileTypeLabel";
import { z } from "zod";
import { validateAutomationFilePath } from "./validateAutomationFilePath.ts";
import { platformAccessLevels } from "../mcp/platformAccess.ts";

/** Internal scheduler preflight. Delay uploaded attachments until processing
 * finishes, without crossing the non-replayable chat-submission fence. */
export async function automationFileIsReady(
  id: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data: run, error } = await supabase
    .from("automation_runs")
    .select("automation_id, revision, occurrence, event, state")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("AUTOMATION_READ_FAILED");
  if (!run || run.state !== "pending" || !run.event) return true;
  const { data: a, error: readError } = await supabase
    .from("automations")
    .select("user_id, revision, enabled, access_level, trigger")
    .eq("id", run.automation_id)
    .maybeSingle();
  if (readError) throw new Error("AUTOMATION_READ_FAILED");
  // Let beginAutomationRun cancel stale/paused runs immediately. Waiting for
  // their attachments first can otherwise keep them pending for days.
  if (
    !a ||
    a.revision !== run.revision ||
    (!a.enabled && !run.occurrence.startsWith("manual:"))
  )
    return true;
  const trigger = automationTriggerSchema.parse(a.trigger);
  const event = z
    .object({ type: z.string(), path: z.string() })
    .parse(run.event);
  if (
    trigger.type !== "storage" ||
    trigger.attachment === "none" ||
    event.type === "deleted" ||
    !fileNeedsProcessing(event.path)
  )
    return true;
  const path = validateAutomationFilePath(event.path, trigger);
  const savedLevel = z
    .enum(["editor", "workspace", "admin"])
    .parse(a.access_level);
  const requestedLevel = run.occurrence.startsWith("manual:")
    ? z
        .object({ accessLevel: z.enum(["editor", "workspace", "admin"]) })
        .parse(run.event).accessLevel
    : savedLevel;
  const level =
    platformAccessLevels[
      Math.min(
        platformAccessLevels.indexOf(savedLevel),
        platformAccessLevels.indexOf(requestedLevel),
      )
    ]!;
  const claims = await getAutomationOwner(a.user_id, { supabase, level });
  const caller = await createClientWithClaims(a.user_id, claims);
  await requireStorageAccess(trigger.storage, "read", { supabase: caller });
  const session = new StorageSession({
    storage: trigger.storage,
    supabaseStorage: caller.storage,
  });
  // A vanished file is a terminal execution failure, not pending processing.
  if (!(await inspect(path, session))?.file) return true;
  return Boolean(await getDocumentContent(path, session));
}
