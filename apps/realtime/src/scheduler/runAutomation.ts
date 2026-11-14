import { randomUUID } from "node:crypto";
import type { Hocuspocus } from "@hocuspocus/server";
import { parseAutomationRunsDocumentName } from "@schornio/aibox-database/automation/_realtime";
import { getAutomationRunsUpdates } from "@schornio/aibox-realtime/documents/automationRuns/_schema";
import { z } from "zod";
import { automationFileIsReady } from "@schornio/aibox-database/automation/automationFileIsReady";
import { beginAutomationRun } from "@schornio/aibox-database/automation/beginAutomationRun";
import { finishAutomationRun } from "@schornio/aibox-database/automation/finishAutomationRun";
import { getAutomationForRun } from "@schornio/aibox-database/automation/getAutomationForRun";
import { getAutomationOwner } from "@schornio/aibox-database/automation/getAutomationOwner";
import { createClientWithClaims } from "@schornio/aibox-database/auth/createClientWithClaims";
import { requirePlatformAccess } from "@schornio/aibox-database/mcp/platformAccess";
import type { PlatformAccessLevel } from "@schornio/aibox-database/mcp/platformAccess";
import { getAgentById } from "@schornio/aibox-database/agent/getAgentById";
import { requireStorageAccess } from "@schornio/aibox-database/storage/requireStorageAccess";
import type {
  ScheduledJob,
  SchedulerOptions,
} from "@schornio/aibox-database/scheduler/_types";
import { sendChatMessage } from "@schornio/aibox-realtime/platform/sendChatMessage";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";

export async function runAutomation(
  job: ScheduledJob,
  signal: AbortSignal,
  options: SchedulerOptions & {
    serverToken: `Worker ${string}`;
    instance: Hocuspocus;
  },
) {
  const { runId } = z.object({ runId: z.uuid() }).parse(job.payload);
  signal.throwIfAborted();
  let automationId: string | undefined;
  const notify = () => {
    for (const [name, document] of options.instance.documents) {
      const id = parseAutomationRunsDocumentName(name);
      if (id && (!automationId || id === automationId))
        getAutomationRunsUpdates(document).set("revision", randomUUID());
    }
  };
  // Use the scheduler's existing Yjs server. Only loaded, authorized run-history
  // rooms receive invalidations; no database payload or new transport is needed.
  notify();
  try {
    let ready = true;
    try {
      ready = await automationFileIsReady(runId, options);
    } catch {
      /* The fenced execution below records authorization/read failures. */
    }
    if (!ready && job.attempts < job.max_attempts)
      throw new Error("AUTOMATION_FILE_PENDING");
    const run = await beginAutomationRun(runId, job.lease_token!, options);
    if (!run) return;
    automationId = run.automation_id;
    notify();
    try {
      const manual = run.occurrence?.startsWith("manual:") === true;
      const manualEvent = manual
        ? z
            .object({ accessLevel: z.enum(["editor", "workspace", "admin"]) })
            .parse(run.event)
        : undefined;
      const automation = await getAutomationForRun(run.automation_id, options);
      if (
        !automation ||
        (!automation.enabled && !manual) ||
        automation.revision !== run.revision
      )
        throw new Error("AUTOMATION_CANCELLED");
      const claims = await getAutomationOwner(automation.user_id, options);
      const supabase = await createClientWithClaims(automation.user_id, claims);
      const agent = await getAgentById(automation.agent_id, { supabase });
      requirePlatformAccess(claims, "admin", "editor", agent.workspaceId);
      const files: NonNullable<Parameters<typeof sendChatMessage>[0]["files"]> =
        [];
      let text = automation.message;
      if (automation.trigger.type === "storage") {
        await requireStorageAccess(automation.trigger.storage, "read", {
          supabase,
        });
        const event = z
          .object({ type: z.string(), path: z.string() })
          .parse(run.event);
        if (event.path)
          text += `\n\nStorage event: ${event.type}\nFile: ${event.path}`;
        if (
          event.path &&
          event.type !== "deleted" &&
          automation.trigger.attachment !== "none"
        )
          files.push({
            storage: automation.trigger.storage,
            path: event.path,
            attachmentMode: automation.trigger.attachment,
          });
      }
      signal.throwIfAborted();
      await sendChatMessage(
        { agentId: agent.id, newActivityId: run.activity_id, text, files },
        {
          userId: automation.user_id,
          claims,
          level: (manualEvent?.accessLevel ??
            automation.access_level) as PlatformAccessLevel,
          supabase,
          supabaseServiceRole: options.supabase,
          serverToken: options.serverToken,
          websocketProvider: new ServerRealtimeWebsocketProvider(),
        },
      );
      await finishAutomationRun(run.id, "queued", options);
    } catch {
      await finishAutomationRun(run.id, "failed", options);
    }
  } finally {
    // Includes cancelled/interrupted fences and deferred file readiness.
    // Publishing happens after the database write, so readers see its result.
    notify();
  }
}
