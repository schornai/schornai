import { withStorageFileLock } from "@schornio/aibox-database/storage/withStorageFileLock";
/* eslint-disable no-console */
import { ServerRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { StorageRealtimeSession } from "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession";
import { TaskQueue } from "@schornio/aibox-realtime/documents/taskQueue/TaskQueue";
import { createClientWithClaims } from "@schornio/aibox-database/auth/createClientWithClaims";
import { createDocumentTranscription } from "@schornio/aibox-database/storage/createDocumentTranscription";
import { getAIModelByIdentifier } from "@schornio/aibox-database/aiModel/getAIModelByIdentifier";
import { getDocumentBlob } from "@schornio/aibox-database/storage/getDocumentBlob";
import { inspect } from "@schornio/aibox-database/storage/inspect";
import { createIndex } from "@schornio/aibox-database/storage/createIndex";
import { transcriptionToText } from "@schornio/aibox-database/storage/transcriptionToText";
import { getDocumentRepositoryById } from "@schornio/aibox-database/documentRepositories/getDocumentRepositoryById";
import { aiboxModelEmbedding } from "@schornio/aibox-realtime/_lib/aiboxModelEmbedding";
import { TranscriberProcess } from "./runTranscriber.ts";
import { prepareTranscriberEnvironment } from "@schornio/aibox-package-utils/prepareTranscriberEnvironment";
import { getInstalledModels } from "./getInstalledModels.ts";

export async function transcribeWorker({
  token,
  workerIdentifier,
  abortSignal,
}: {
  token: string;
  workerIdentifier: string;
  abortSignal?: AbortSignal;
}) {
  Object.assign(process.env, prepareTranscriberEnvironment(process.env));
  await using transcriber = new TranscriberProcess();
  const websocketProvider = new ServerRealtimeWebsocketProvider();
  const serverToken = ServerRealtimeProvider.getServerToken(token);

  const taskQueue = new TaskQueue("transcribe", {
    capabilities: getInstalledModels,
    serverToken,
    websocketProvider,
    workerIdentifier,
  });

  await taskQueue.handleTask(
    async (claimedTask, requestSignal) => {
      console.log("Init transcriptor");

      const supabase = await createClientWithClaims(
        claimedTask.parameters.userId,
        claimedTask.parameters.userClaims,
      ).catch(() => {
        const message =
          "Transcriber could not initialize user authorization. Check the worker JWT signing configuration and user claims.";
        console.error(message, { taskId: claimedTask.id });
        throw new Error(message);
      });

      return withStorageFileLock(
        claimedTask.parameters.storage,
        claimedTask.parameters.path,
        supabase,
        requestSignal,
        async (abortSignal) => {
          await using storageSession = new StorageRealtimeSession({
            abortSignal,
            serverToken,
            storage: claimedTask.parameters.storage,
            supabaseStorage: supabase.storage,
            websocketProvider,
          });

          const target = await inspect(
            claimedTask.parameters.path,
            storageSession,
          );

          if (!(target && target.file)) {
            const errorMessage = `transcribeWorker: File not found: "${claimedTask.parameters.path}"`;
            console.error(errorMessage);
            throw new Error(errorMessage);
          }

          console.log("Setup task complete");
          storageSession.logAction({ state: "processing", target });
          try {
            const [file, model] = await Promise.all([
              getDocumentBlob(target.path, storageSession),
              getAIModelByIdentifier(claimedTask.parameters.modelIdentifier, {
                abortSignal,
                supabase,
              }),
            ]);

            if (!file) {
              const errorMessage = `transcribeWorker: Cannot get file content: "${claimedTask.parameters.path}"`;
              console.error(errorMessage);
              throw new Error(errorMessage);
            }

            if (model.type !== "mlx_whisper_v1") {
              const errorMessage = `transcribeWorker: Is not a mlx_whisper_v1 model: "${claimedTask.parameters.modelIdentifier}"`;
              console.error(errorMessage);
              throw new Error(errorMessage);
            }

            console.log("Start transcription");
            console.time("Transcription finished");

            const transcription = await transcriber.transcribe({
              abortSignal,
              file,
              modelIdentifier: model.config.fileSystemIdentifier,
              modelPrompt: claimedTask.parameters.modelPrompt,
              retryLevel: claimedTask.parameters.retryLevel,
            });

            console.timeEnd("Transcription finished");

            await createDocumentTranscription(
              target,
              transcription,
              storageSession,
            );
            if (storageSession.storage.type === "documentRepository") {
              const repository = await getDocumentRepositoryById(
                storageSession.storage.documentRepositoryId,
                { abortSignal, supabase },
              );
              await createIndex(
                target,
                transcriptionToText(transcription),
                repository,
                storageSession,
                {
                  abortSignal,
                  supabase,
                  embeddingModel: (modelId) =>
                    aiboxModelEmbedding(modelId, {
                      serverToken,
                      websocketProvider,
                    }),
                },
              );
            }
            storageSession.logAction({
              state: "created",
              target,
              content: { ...transcription, type: "transcript" },
            });
          } catch (error) {
            console.error("Unknown error", String(error));
            storageSession.logAction({
              message: String(error),
              state: "error",
              target,
            });
            throw error;
          }
        },
      );
    },
    { abortSignal },
  );
}
