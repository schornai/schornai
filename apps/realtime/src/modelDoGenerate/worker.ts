import { ServerRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { TaskQueue } from "@schornio/aibox-realtime/documents/taskQueue/TaskQueue";
import { createTaskOllama } from "../_utils/createTaskOllama.ts";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";
import { getOllamaModelIdentifiers } from "../_utils/getOllamaModelIdentifiers.ts";

export async function modelDoGenerateWorker({
  token,
  workerIdentifier,
  capabilitiesChanged,
}: {
  token: string;
  workerIdentifier: string;
  capabilitiesChanged?: EventTarget;
}) {
  const websocketProvider = new ServerRealtimeWebsocketProvider();
  const serverToken = ServerRealtimeProvider.getServerToken(token);

  const taskQueue = new TaskQueue("model-do-generate", {
    capabilitiesChanged,
    capabilities: async (abortSignal) => [
      ...(await getOllamaModelIdentifiers(
        getEnvSafe("OLLAMA_URL"),
        abortSignal,
      )),
      "router-v1",
    ],
    serverToken,
    websocketProvider,
    workerIdentifier,
  });

  await taskQueue.handleTask(async (claimedTask, abortSignal) => {
    const { modelId, ...options } = claimedTask.parameters;
    const model = createTaskOllama(abortSignal)(modelId);
    const result = await model.doGenerate({ ...options, abortSignal });
    return result;
  });
}
