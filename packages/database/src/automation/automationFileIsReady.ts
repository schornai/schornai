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

/** Internal scheduler preflight. Delay uploaded attachments until processing
 * finishes, without crossing the non-replayable chat-submission fence. */
export async function automationFileIsReady(
  id: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data: run, error } = await supabase
    .from("automation_runs")
    .select("automation_id, event, state")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("AUTOMATION_READ_FAILED");
  if (!run || run.state !== "pending" || !run.event) return true;
  const { data: a, error: readError } = await supabase
    .from("automations")
    .select("user_id, trigger")
    .eq("id", run.automation_id)
    .maybeSingle();
  if (readError) throw new Error("AUTOMATION_READ_FAILED");
  if (!a) return true;
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
  const claims = await getAutomationOwner(a.user_id, { supabase });
  const caller = await createClientWithClaims(a.user_id, claims);
  await requireStorageAccess(trigger.storage, "read", { supabase: caller });
  const session = new StorageSession({
    storage: trigger.storage,
    supabaseStorage: caller.storage,
  });
  // A vanished file is a terminal execution failure, not pending processing.
  if (!(await inspect(event.path, session))?.file) return true;
  return Boolean(await getDocumentContent(event.path, session));
}
