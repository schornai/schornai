import type { Extension } from "@hocuspocus/server";
import type { AuthenticationContext } from "./createRealtimeAuthentication.ts";
import type { TaskClaimOptions } from "@schornio/aibox-database/task/_types";
import { validateQueueUpdate } from "../documents/taskQueue/validateQueueUpdate.ts";
import { TaskCoordinator } from "../documents/taskQueue/TaskCoordinator.ts";
import { getTaskQueueDocumentName } from "../documents/taskQueue/_utils.ts";
import {
  taskCoordinatorProtocol,
  taskCoordinatorRequestSchema,
} from "../documents/taskQueue/_protocol.ts";
import {
  decodeTaskValue,
  encodeTaskValue,
} from "../documents/taskQueue/_taskCodec.ts";
import type { Task } from "../documents/taskQueue/_types.ts";
import { recoverTaskDocuments } from "./recoverTaskDocuments.ts";

export function createTaskCoordinatorExtension(
  options: TaskClaimOptions,
): Extension<AuthenticationContext> {
  let coordinator: TaskCoordinator | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let sweeping = false;
  const sweep = () => {
    if (!coordinator || sweeping) return;
    sweeping = true;
    const current = coordinator;
    void current
      .run(() => current.reconcile())
      .catch(() => {
        console.error("TASK_COORDINATOR_RECOVERY_UNAVAILABLE");
      })
      .finally(() => {
        sweeping = false;
      });
  };
  const stop = () => {
    clearInterval(timer);
    timer = undefined;
    coordinator = undefined;
  };
  return {
    async afterLoadDocument({ document, documentName, instance }) {
      if (documentName !== getTaskQueueDocumentName()) return;
      const current = new TaskCoordinator(document, options, (task) =>
        recoverTaskDocuments(instance, task, options),
      );
      coordinator = current;
      await current.run(() => current.reconcile());
      timer = setInterval(sweep, 10_000);
      timer.unref();
    },
    async onChange({ documentName }) {
      if (documentName === getTaskQueueDocumentName()) sweep();
    },
    async beforeSync({ document, documentName, type, payload }) {
      if (documentName === getTaskQueueDocumentName() && type !== 0)
        validateQueueUpdate(document, payload);
    },
    async onStateless({ connection, documentName, payload }) {
      if (
        documentName !== getTaskQueueDocumentName() ||
        !connection.context?.authorization?.worker ||
        !coordinator
      )
        return;
      let request;
      try {
        request = taskCoordinatorRequestSchema.safeParse(JSON.parse(payload));
      } catch {
        return;
      }
      if (!request.success) return;
      const command = request.data;
      const response: {
        protocol: typeof taskCoordinatorProtocol;
        requestId: string;
        ok: boolean;
        task?: string;
        accepted?: boolean;
      } = {
        protocol: taskCoordinatorProtocol,
        requestId: command.requestId,
        ok: true,
      };
      const current = coordinator;
      try {
        // Heartbeats only touch their database row. A slow document recovery
        // must not prevent unrelated workers from renewing their live leases.
        if (command.action === "renew")
          response.accepted = await current.renew(
            command.taskId,
            command.token,
          );
        else
          await current.run(async () => {
            if (command.action === "claim") {
              const task = await current.claim(
                command.type,
                command.capabilities,
                command.worker,
              );
              if (task) response.task = encodeTaskValue(task);
            } else
              response.accepted = await current.finish(
                command.taskId,
                command.token,
                command.result
                  ? decodeTaskValue<Task["result"]>(command.result)
                  : undefined,
                command.error,
              );
          });
      } catch {
        response.ok = false;
      }
      connection.sendStateless(JSON.stringify(response));
    },
    async afterUnloadDocument({ documentName }) {
      if (documentName === getTaskQueueDocumentName()) stop();
    },
    async onDestroy() {
      stop();
    },
  };
}
