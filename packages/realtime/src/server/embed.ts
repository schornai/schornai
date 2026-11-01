import type { Embedding } from "@schornio/aibox-realtime/documents/embeddings/_types";
import type { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { ServerRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { addTask } from "@schornio/aibox-realtime/documents/taskQueue/addTask";
import crypto from "node:crypto";
import { getEmbeddings } from "@schornio/aibox-realtime/documents/embeddings/getEmbeddings";
import { getEmbeddingsDocumentName } from "@schornio/aibox-realtime/documents/embeddings/_utils";
import { getTaskQueueDocumentName } from "@schornio/aibox-realtime/documents/taskQueue/_utils";
import { setEmbeddings } from "@schornio/aibox-realtime/documents/embeddings/setEmbeddings";

export async function embed(
  {
    modelId,
    values,
  }: {
    modelId: string;
    values: Embedding[];
  },
  {
    serverToken,
    websocketProvider,
  }: {
    serverToken: `Worker ${string}`;
    websocketProvider: HocuspocusProviderWebsocket;
  },
) {
  const id = crypto.randomUUID();

  await using embeddings = new ServerRealtimeProvider({
    documentName: getEmbeddingsDocumentName({ id }),
    serverToken,
    websocketProvider,
  });

  const embeddingFinished = Promise.withResolvers<Embedding[]>();

  const embeddingsRealtime = getEmbeddings(embeddings.document);

  const checkEmbeddings = () => {
    const result = embeddingsRealtime.embeddings?.toArray();

    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const state = embeddingsRealtime.state.toString();

    if (state === "ready") {
      embeddingsRealtime.state.unobserve(checkEmbeddings);
      embeddingFinished.resolve(result);
    }

    if (state === "error") {
      embeddingsRealtime.state.unobserve(checkEmbeddings);
      embeddingFinished.reject();
    }
  };

  embeddingsRealtime.state.observe(checkEmbeddings);
  checkEmbeddings();

  setEmbeddings(embeddings.document, "queued", values);

  await using taskQueue = new ServerRealtimeProvider({
    documentName: getTaskQueueDocumentName(),
    serverToken,
    websocketProvider,
  });

  addTask(taskQueue.document, {
    content: {
      id,
      modelId,
    },
    id: crypto.randomUUID(),
    requiredCapabilities: [],
    state: "pending",
    type: "embed",
  });

  return await embeddingFinished.promise;
}
