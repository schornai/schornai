import { ServerRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { TaskQueue } from "@schornio/aibox-realtime/documents/taskQueue/TaskQueue";
import { createTaskOllama } from "../_utils/createTaskOllama.ts";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";
import { getModelDoStreamDocumentName } from "@schornio/aibox-realtime/documents/modelDoStream/_utils";
import { getOllamaModelIdentifiers } from "../_utils/getOllamaModelIdentifiers.ts";
import { pushModelDoStreamPart } from "@schornio/aibox-realtime/documents/modelDoStream/pushModelDoStreamPart";
import { setModelDoStreamDone } from "@schornio/aibox-realtime/documents/modelDoStream/setModelDoStreamDone";
import { setModelDoStreamError } from "@schornio/aibox-realtime/documents/modelDoStream/setModelDoStreamError";

export async function modelDoStreamWorker({
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

  const taskQueue = new TaskQueue("model-do-stream", {
    capabilitiesChanged,
    capabilities: async (abortSignal) => [
      ...(await getOllamaModelIdentifiers(
        getEnvSafe("OLLAMA_URL"),
        abortSignal,
      )),
    ],
    serverToken,
    websocketProvider,
    workerIdentifier,
  });

  await taskQueue.handleTask(async (claimedTask, abortSignal) => {
    const { modelDoStreamDocumentId, modelId, ...options } =
      claimedTask.parameters;
    const model = createTaskOllama(abortSignal)(modelId);

    await using modelDoStream = new ServerRealtimeProvider({
      documentName: getModelDoStreamDocumentName({
        id: modelDoStreamDocumentId,
      }),
      serverToken,
      websocketProvider,
    });

    try {
      const result = await model.doStream({ ...options, abortSignal });

      let completeCount = 0;
      for await (const chunk of result.stream) {
        pushModelDoStreamPart(modelDoStream.document, chunk);
        completeCount += 1;
      }

      setModelDoStreamDone(modelDoStream.document, completeCount);
    } catch (error) {
      setModelDoStreamError(modelDoStream.document, error);
    }
  });
}
