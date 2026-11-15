import { runAutomationNow } from "@schornio/aibox-database/automation/runAutomationNow";
import { z } from "zod";
import {
  automationInputSchema,
  automationRunInputSchema,
} from "@schornio/aibox-database/automation/_schemas";
import { getAutomations } from "@schornio/aibox-database/automation/getAutomations";
import { saveAutomation } from "@schornio/aibox-database/automation/saveAutomation";
import { deleteAutomation } from "@schornio/aibox-database/automation/deleteAutomation";
import { getAutomationRuns } from "@schornio/aibox-database/automation/getAutomationRuns";
import type { PlatformContext, platformRegistry } from "./registry.ts";

export function addAutomationTools(
  context: PlatformContext,
  { add }: ReturnType<typeof platformRegistry>,
) {
  add(
    "platform_automation_run",
    "Run your saved automation now, including while paused, without changing its schedule. Supply a stable requestId UUID for safe retries. Storage triggers with attachments require an existing file path within the configured folder; other tests send only the saved message. Returns the execution id; inspect runs for its outcome.",
    "editor",
    false,
    automationRunInputSchema,
    (input) => runAutomationNow(input, context),
  );
  add(
    "platform_automations_list",
    "List your automations. Requires editor access.",
    "editor",
    true,
    z.object({}),
    () => getAutomations(context),
  );
  add(
    "platform_automation_save",
    "Create or update your automation. Starts a new chat on a time or storage trigger. Calendar weekdays use 0=Sunday; days are elapsed 24-hour periods. Reference attachments require an agent mount. Deleted files cannot be attached. Supply id to update; omit id to create or save a copy (set enabled=false for a paused copy). Description, color and icon control the app card independently from the chat message. Daily schedules use kind=weekly with all seven weekdays. Saving resets the schedule and cancels pending older runs.",
    "editor",
    false,
    automationInputSchema,
    (input) => saveAutomation(input, context),
  );
  add(
    "platform_automation_delete",
    "Delete your automation. Already queued chats continue.",
    "editor",
    false,
    z.object({ id: z.uuid() }),
    ({ id }) => deleteAutomation(id, context),
  );
  add(
    "platform_automation_runs",
    "List the last 50 executions of your automation. Queued means chat submitted, not generation completed. Interrupted executions are not replayed.",
    "editor",
    true,
    z.object({ id: z.uuid() }),
    ({ id }) => getAutomationRuns(id, context),
  );
}
