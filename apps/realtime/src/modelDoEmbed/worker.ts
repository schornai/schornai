/* eslint-disable no-console */
import { ServerRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { TaskQueue } from "@schornio/aibox-realtime/documents/taskQueue/TaskQueue";
import { createTaskOllama } from "../_utils/createTaskOllama.ts";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";
import { getModelDoEmbed } from "@schornio/aibox-realtime/documents/modelDoEmbed/getModelDoEmbed";
import { getModelDoEmbedDocumentName } from "@schornio/aibox-realtime/documents/modelDoEmbed/_utils";
import { getOllamaModelIdentifiers } from "../_utils/getOllamaModelIdentifiers.ts";
import { setModelDoEmbedResult } from "@schornio/aibox-realtime/documents/modelDoEmbed/setModelDoEmbedResult";

export async function modelDoEmbedWorker({
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

  const taskQueue = new TaskQueue("model-do-embed", {
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
    console.time("Embedding ended");
    console.log("Embedding started...");
    const { modelDoEmbedDocumentId, modelId } = claimedTask.parameters;

    await using modelDoEmbed = new ServerRealtimeProvider({
      documentName: getModelDoEmbedDocumentName({
        id: modelDoEmbedDocumentId,
      }),
      serverToken,
      websocketProvider,
    });
    await modelDoEmbed.waitForSynced();

    const { values, ...parameters } = getModelDoEmbed(
      modelDoEmbed.document,
    ).parameters.getObject();

    if (!values) {
      throw new Error("getModelDoEmbed -> values empty");
    }

    const model = createTaskOllama(abortSignal).embeddingModel(modelId);
    const result = await model.doEmbed({
      ...parameters,
      abortSignal,
      values,
    });

    setModelDoEmbedResult(modelDoEmbed.document, result);
    console.timeEnd("Embedding ended");
  });
}
