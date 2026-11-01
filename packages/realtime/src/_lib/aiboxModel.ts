import type { LanguageModelV4 } from "../documents/modelDoStream/_types.ts";
import { ServerRealtimeProvider } from "../server/ServerRealtimeProvider.ts";
import type { ServerRealtimeWebsocketProvider } from "../server/ServerRealtimeWebsocketProvider.ts";
import { getModelDoGenerateReadableStream } from "../documents/modelDoStream/getModelDoGenerateReadableStream.ts";
import { getModelDoStreamDocumentName } from "../documents/modelDoStream/_utils.ts";
import { runTask } from "../documents/taskQueue/runTask.ts";
import { setModelDoStreamError } from "../documents/modelDoStream/setModelDoStreamError.ts";

export function aiboxModel(
  modelId: string,
  {
    serverToken,
    websocketProvider,
  }: {
    serverToken: `Worker ${string}`;
    websocketProvider: ServerRealtimeWebsocketProvider;
  },
): LanguageModelV4 {
  return {
    async doGenerate({ abortSignal, ...options }) {
      return await runTask(
        "model-do-generate",
        {
          ...options,
          modelId,
        },
        [modelId],
        { abortSignal, serverToken, websocketProvider },
      );
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async doStream({ abortSignal, ...options }) {
      const cancellation = new AbortController();
      const signal = abortSignal
        ? AbortSignal.any([abortSignal, cancellation.signal])
        : cancellation.signal;
      const modelDoStreamDocumentId = crypto.randomUUID();

      const modelDoStreamDocumentName = getModelDoStreamDocumentName({
        id: modelDoStreamDocumentId,
      });

      const modelDoStream = new ServerRealtimeProvider({
        documentName: modelDoStreamDocumentName,
        serverToken,
        websocketProvider,
      });

      const stream = getModelDoGenerateReadableStream(modelDoStream.document, {
        onStreamDone: () => void modelDoStream[Symbol.asyncDispose](),
        onStreamError: () => void modelDoStream[Symbol.asyncDispose](),
        onStreamCancel: () => {
          cancellation.abort();
          void modelDoStream[Symbol.asyncDispose]();
        },
      });

      void runTask(
        "model-do-stream",
        {
          ...options,
          modelDoStreamDocumentId,
          modelId,
        },
        [modelId],
        { abortSignal: signal, serverToken, websocketProvider },
      ).catch((error: unknown) => {
        if (!cancellation.signal.aborted) {
          setModelDoStreamError(modelDoStream.document, error);
        }
      });

      return { stream };
    },

    modelId,
    provider: "aibox",
    specificationVersion: "v4",
    supportedUrls: {
      "image/*": [
        /^data:image\/[^;]+;base64,/i, // Data URLs
      ],
    },
  };
}
