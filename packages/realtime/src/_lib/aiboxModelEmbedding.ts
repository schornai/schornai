import type { EmbeddingModelV4 } from "../documents/modelDoEmbed/_types.ts";
import { ServerRealtimeProvider } from "../server/ServerRealtimeProvider.ts";
import type { ServerRealtimeWebsocketProvider } from "../server/ServerRealtimeWebsocketProvider.ts";
import { getModelDoEmbed } from "../documents/modelDoEmbed/getModelDoEmbed.ts";
import { getModelDoEmbedDocumentName } from "../documents/modelDoEmbed/_utils.ts";
import { runTask } from "../documents/taskQueue/runTask.ts";
import { setModelDoEmbedParameters } from "../documents/modelDoEmbed/setModelDoEmbedParameters.ts";

export function aiboxModelEmbedding(
  modelId: string,
  {
    serverToken,
    websocketProvider,
  }: {
    serverToken: `Worker ${string}`;
    websocketProvider: ServerRealtimeWebsocketProvider;
  },
): EmbeddingModelV4 {
  return {
    async doEmbed({ abortSignal, ...options }) {
      const modelDoEmbedDocumentId = crypto.randomUUID();

      await using modelDoEmbed = new ServerRealtimeProvider({
        documentName: getModelDoEmbedDocumentName({
          id: modelDoEmbedDocumentId,
        }),
        serverToken,
        websocketProvider,
      });

      setModelDoEmbedParameters(modelDoEmbed.document, options);
      await modelDoEmbed.waitForSynced();

      await runTask(
        "model-do-embed",
        { modelDoEmbedDocumentId, modelId, ...options },
        [modelId],
        {
          abortSignal,
          serverToken,
          websocketProvider,
        },
      );
      await modelDoEmbed.waitForSynced();

      const { embeddings, warnings, ...result } = getModelDoEmbed(
        modelDoEmbed.document,
      ).result.getObject();

      if (!embeddings) {
        throw new Error("doEmbed result -> no embeddings");
      }

      return { ...result, embeddings, warnings: warnings ?? [] };
    },
    maxEmbeddingsPerCall: 2048,
    modelId,
    provider: "aibox",
    specificationVersion: "v4",
    supportsParallelCalls: true,
  };
}
