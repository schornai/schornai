import { getDocumentContent } from "@schornio/aibox-database/storage/getDocumentContent";
import { transcriptionToText } from "@schornio/aibox-database/storage/transcriptionToText";
import { withStorageFileLock } from "@schornio/aibox-database/storage/withStorageFileLock";
import { ServerRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { TaskQueue } from "@schornio/aibox-realtime/documents/taskQueue/TaskQueue";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";
import { getOllamaModelIdentifiers } from "../_utils/getOllamaModelIdentifiers.ts";
import { getDocumentBlob } from "@schornio/aibox-database/storage/getDocumentBlob";
import { StorageRealtimeSession } from "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession";
import { createClientWithClaims } from "@schornio/aibox-database/auth/createClientWithClaims";
import { readFileContent } from "./readFileContent.ts";
import { inspect } from "@schornio/aibox-database/storage/inspect";
import { createIndex } from "@schornio/aibox-database/storage/createIndex";
import { getDocumentRepositoryById } from "@schornio/aibox-database/documentRepositories/getDocumentRepositoryById";

import { saveDocumentContent } from "@schornio/aibox-database/storage/saveDocumentContent";
import { fileNeedsProcessing } from "@schornio/aibox-package-utils/getFileTypeLabel";
import { aiboxModelEmbedding } from "@schornio/aibox-realtime/_lib/aiboxModelEmbedding";

export async function processFileWorker({
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

  const taskQueue = new TaskQueue("process-file", {
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

  await taskQueue.handleTask(async (claimedTask, requestSignal) => {
    const supabase = await createClientWithClaims(
      claimedTask.parameters.userId,
      claimedTask.parameters.userClaims,
    );
    return withStorageFileLock(
      claimedTask.parameters.storage,
      claimedTask.parameters.path,
      supabase,
      requestSignal,
      async (abortSignal) => {
        await using storageSession = new StorageRealtimeSession({
          abortSignal,
          serverToken: `Worker ${token}`,
          storage: claimedTask.parameters.storage,
          supabaseStorage: supabase.storage,
          websocketProvider,
        });

        const useSavedContent =
          claimedTask.parameters.useSavedContent ||
          claimedTask.parameters.reuseContent;
        const [fileObject, blob] = await Promise.all([
          inspect(claimedTask.parameters.path, storageSession),
          useSavedContent
            ? Promise.resolve(undefined)
            : getDocumentBlob(claimedTask.parameters.path, storageSession),
        ]);

        if (!fileObject || !fileObject.file || (!blob && !useSavedContent)) {
          if (fileObject) {
            storageSession.logAction({
              message: "File has no content",
              state: "error",
              target: fileObject,
            });
          }

          throw new Error();
        }

        storageSession.logAction({ state: "processing", target: fileObject });
        try {
          const savedContent = useSavedContent
            ? await getDocumentContent(fileObject.path, storageSession)
            : undefined;
          const content = useSavedContent
            ? savedContent?.type === "transcript"
              ? transcriptionToText(savedContent)
              : savedContent?.current
            : fileNeedsProcessing(fileObject.path)
              ? await readFileContent(blob!, abortSignal)
              : await blob!.text();

          if (content !== undefined) {
            const saved =
              useSavedContent ||
              (await saveDocumentContent(
                fileObject,
                { current: content, type: "mdc", versions: [] },
                storageSession,
              ));

            if (saved === false)
              throw new Error("Unable to save extracted content.");

            if (storageSession.storage.type === "documentRepository") {
              const documentRepository = await getDocumentRepositoryById(
                storageSession.storage.documentRepositoryId,
                { abortSignal, supabase },
              );

              await createIndex(
                fileObject,
                content,
                documentRepository,
                storageSession,
                {
                  abortSignal,
                  embeddingModel: (modelId) =>
                    aiboxModelEmbedding(modelId, {
                      serverToken,
                      websocketProvider,
                    }),
                  supabase,
                },
              );
            }
            storageSession.logAction({
              state: "created",
              target: fileObject,
              content: savedContent ?? {
                current: content,
                type: "mdc",
                versions: [],
              },
            });
          } else {
            throw new Error("Unable to extract file content");
          }
        } catch (error) {
          storageSession.logAction({
            state: "error",
            target: fileObject,
            message: String(error),
          });
          throw error;
        }
        return undefined;
      },
    );
  });
}
