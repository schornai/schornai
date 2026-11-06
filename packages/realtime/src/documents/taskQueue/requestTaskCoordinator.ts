import type { HocuspocusProvider } from "@hocuspocus/provider";
import {
  taskCoordinatorProtocol,
  taskCoordinatorResponseSchema,
  type TaskCoordinatorCommand,
} from "./_protocol.ts";

/** Only a coordinator acknowledgement grants ownership; local Yjs state does not. */
export async function requestTaskCoordinator(
  provider: HocuspocusProvider,
  command: TaskCoordinatorCommand,
  abortSignal?: AbortSignal,
) {
  const signal = AbortSignal.any([
    AbortSignal.timeout(10_000),
    ...(abortSignal ? [abortSignal] : []),
  ]);
  signal.throwIfAborted();
  const requestId = crypto.randomUUID();
  return new Promise<ReturnType<typeof taskCoordinatorResponseSchema.parse>>(
    (resolve, reject) => {
      const cleanup = () => {
        signal.removeEventListener("abort", onAbort);
        provider.off("stateless", onResponse);
        provider.off("close", onClose);
        provider.off("destroy", onClose);
      };
      const onAbort = () => {
        cleanup();
        reject(signal.reason);
      };
      const onClose = () => {
        cleanup();
        reject(new Error("TASK_COORDINATOR_DISCONNECTED"));
      };
      const onResponse = ({ payload }: { payload: string }) => {
        let parsed;
        try {
          parsed = taskCoordinatorResponseSchema.safeParse(JSON.parse(payload));
        } catch {
          return;
        }
        if (!parsed.success || parsed.data.requestId !== requestId) return;
        cleanup();
        if (parsed.data.ok) resolve(parsed.data);
        else reject(new Error("TASK_COORDINATOR_UNAVAILABLE"));
      };
      provider.on("stateless", onResponse);
      provider.on("close", onClose);
      provider.on("destroy", onClose);
      signal.addEventListener("abort", onAbort, { once: true });
      try {
        provider.sendStateless(
          JSON.stringify({
            protocol: taskCoordinatorProtocol,
            requestId,
            ...command,
          }),
        );
      } catch {
        onClose();
      }
    },
  );
}
