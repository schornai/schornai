import { getDocumentRepositories } from "@schornio/aibox-database/documentRepositories/getDocumentRepositories";
import { requireStorageAccess } from "@schornio/aibox-database/storage/requireStorageAccess";
import { storageToAgentPath } from "@schornio/aibox-database/storage/_utils/storageToAgentPath";
import {
  ServerBatchRealtimeProvider,
  ServerRealtimeProvider,
} from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { readUIMessageStream, toUIMessageStream } from "ai";
import type { Activity } from "@schornio/aibox-realtime/documents/activity/_types";
import { AgentToolSession } from "./AgentToolSession.ts";
import type { ChatMessage } from "@schornio/aibox-database/chat/_types";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { StorageSession } from "@schornio/aibox-database/storage/_utils/StorageSession";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import { TaskQueue } from "@schornio/aibox-realtime/documents/taskQueue/TaskQueue";
import { addChatMessage } from "@schornio/aibox-realtime/documents/chat/addChatMessage";
import { getChatModel } from "@schornio/aibox-realtime/models/getChatModel";
import { claimNextChatCurrentMessage } from "@schornio/aibox-realtime/documents/chatCurrentMessage/claimNextChatCurrentMessage";
import { convertToModelMessages } from "ai";
import { createClientWithClaims } from "@schornio/aibox-database/auth/createClientWithClaims";
import { getActivitiesDocumentName } from "@schornio/aibox-realtime/documents/activity/_utils";
import { getAgentById } from "@schornio/aibox-database/agent/getAgentById";
import { getAllowedUserIdsByDocumentName } from "@schornio/aibox-realtime/_lib/getAllowedUserIdsByDocumentName";
import { getChat } from "@schornio/aibox-realtime/documents/chat/getChat";
import { getChatCurrentMessageDocumentName } from "@schornio/aibox-realtime/documents/chatCurrentMessage/_utils";
import { getChatDocumentName } from "@schornio/aibox-realtime/documents/chat/_utils";
import { getChatInteraction } from "@schornio/aibox-realtime/documents/chat/getChatInteraction";
import { getReasoning } from "../_utils/getReasoning.ts";
import { loadMessageFiles } from "@schornio/aibox-database/chat/loadMessageFiles";
import { respondToToolApproval } from "@schornio/aibox-realtime/documents/chat/respondToToolApproval";
import { selectRole } from "./selectRole.ts";
import { setChatState } from "@schornio/aibox-realtime/documents/chat/setChatState";
import { streamText } from "ai-sdk-ollama";
import { updateChatMessage } from "@schornio/aibox-realtime/documents/chat/updateChatMessage";
import { upsertActivity } from "@schornio/aibox-realtime/documents/activity/upsertActivity";

export async function chatWorker({
  supabaseServiceRole,
  token,
  workerIdentifier,
}: {
  supabaseServiceRole: SupabaseClient;
  token: string;
  workerIdentifier: string;
}) {
  const websocketProvider = new ServerRealtimeWebsocketProvider();
  const serverToken = ServerRealtimeProvider.getServerToken(token);

  const taskQueue = new TaskQueue("chat", {
    capabilities: [],
    serverToken,
    websocketProvider,
    workerIdentifier,
  });

  await taskQueue.handleTask(async (claimedTask, abortSignal) => {
    const chatDocumentName = getChatDocumentName({
      activityId: claimedTask.parameters.activityId,
      agentId: claimedTask.parameters.agentId,
    });

    await using chat = new ServerRealtimeProvider({
      documentName: chatDocumentName,
      serverToken,
      websocketProvider,
    });

    await using currentChatMessage = new ServerRealtimeProvider({
      documentName: getChatCurrentMessageDocumentName({
        activityId: claimedTask.parameters.activityId,
        agentId: claimedTask.parameters.agentId,
      }),
      serverToken,
      websocketProvider,
    });

    const allowedUserIds = await getAllowedUserIdsByDocumentName(
      chatDocumentName,
      { abortSignal, supabase: supabaseServiceRole },
    );

    await using activites = new ServerBatchRealtimeProvider({
      documentNames: allowedUserIds.map((userId) =>
        getActivitiesDocumentName({ userId }),
      ),
      serverToken,
      websocketProvider,
    });

    const [supabase] = await Promise.all([
      createClientWithClaims(
        claimedTask.parameters.userId,
        claimedTask.parameters.userClaims,
      ),
      chat.waitForSynced({ abortSignal }),
      currentChatMessage.waitForSynced({ abortSignal }),
      activites.waitForSynced({ abortSignal }),
    ]);

    try {
      const activityContent: Activity["content"] = {
        chatbotId: claimedTask.parameters.agentId,
        type: "chat",
      };

      const assertGenerationActive = (allowFinalPartialAnswer = false) => {
        if (
          !allowFinalPartialAnswer ||
          (abortSignal.reason instanceof Error &&
            abortSignal.reason.message === "TASK_LEASE_LOST")
        )
          abortSignal.throwIfAborted();
        const state = chat.document.getMap("state");
        if (
          (state.has("generationId") &&
            state.get("generationId") !== claimedTask.id) ||
          ["idle", "error"].includes(String(state.get("type")))
        )
          throw new DOMException("Generation no longer active", "AbortError");
      };
      const claimNextInput = () => {
        assertGenerationActive();
        return claimNextChatCurrentMessage(currentChatMessage.document, {
          awaitingApproval:
            getChatInteraction(getChat(chat.document).messages?.toArray() ?? [])
              .type === "tool-approval",
        });
      };
      let claimedCurrentChatMessage = claimNextInput();

      setChatState(chat.document, {
        generationId: claimedTask.id,
        claimedAtISO: claimedTask.claimedAtISO,
        claimedWorkerId: workerIdentifier,
        type: "generating",
      });
      activites.batch(
        upsertActivity,
        {
          content: activityContent,
          id: claimedTask.parameters.activityId,
          state: "running",
        },
        {
          labelOnInsert:
            claimedCurrentChatMessage?.content.type === "text"
              ? claimedCurrentChatMessage.content.text
              : undefined,
        },
      );

      while (claimedCurrentChatMessage) {
        abortSignal.throwIfAborted();
        const { content: messageContent } = claimedCurrentChatMessage;

        if (messageContent.type === "text") {
          const { text: message, files } = messageContent;

          const chatMessage: ChatMessage = {
            id: crypto.randomUUID(),
            parts: [
              {
                text: message?.toString() ?? "",
                type: "text",
              },
              ...(files?.map((file) => ({
                data: {
                  id: file.path,
                  name: file.name,
                  type: file.file ? file.type : "application/octet-stream",
                  url: file.path,
                  attachment: file.attachment,
                },
                type: "data-file" as const,
              })) ?? []),
            ],
            role: "user",
          };

          addChatMessage(chat.document, chatMessage);
        }

        if (messageContent.type === "tool-approval") {
          respondToToolApproval(chat.document, messageContent);
          if (
            getChatInteraction(getChat(chat.document).messages?.toArray() ?? [])
              .type === "tool-approval"
          ) {
            await currentChatMessage.waitForSynced();
            claimedCurrentChatMessage = claimNextInput();
            continue;
          }
        }

        const { messages: yMessages } = getChat(chat.document);
        const messages = yMessages?.toArray() ?? [];

        const agent = await getAgentById(claimedTask.parameters.agentId, {
          abortSignal,
          supabase,
        });
        const repositories = messages.some((message) =>
          message.parts.some(
            (part) => part.type === "data-file" && part.data.attachment,
          ),
        )
          ? await getDocumentRepositories({ supabase })
          : [];
        const loadedMessages = await loadMessageFiles(
          messages,
          new StorageSession({
            abortSignal,
            storage: {
              activityId: claimedTask.parameters.activityId,
              agentId: claimedTask.parameters.agentId,
              type: "activity",
            },
            supabaseStorage: supabase.storage,
          }),
          {
            resolveReference: async (file) => {
              if (!file.attachment) return undefined;
              try {
                const agentPath = storageToAgentPath({
                  storage: file.attachment.storage,
                  path: file.url,
                  roles: agent.roles,
                  repositories,
                  agentId: agent.id,
                  activityId: claimedTask.parameters.activityId,
                });
                if (!agentPath) return undefined;
                await requireStorageAccess(file.attachment.storage, "read", {
                  supabase,
                });
                return {
                  agentPath,
                  storageSession: new StorageSession({
                    storage: file.attachment.storage,
                    supabaseStorage: supabase.storage,
                    abortSignal,
                  }),
                };
              } catch {
                return undefined;
              }
            },
          },
        );
        const modelMessages = await convertToModelMessages(loadedMessages);

        const previousMetadata = messages.at(-1)?.metadata;
        const thinking =
          messageContent.thinking ??
          (messageContent.type === "tool-approval"
            ? previousMetadata?.thinking
            : false) ??
          false;
        const resumedRole =
          messageContent.type === "tool-approval" && previousMetadata?.roleId
            ? agent.roles.find((role) => role.id === previousMetadata.roleId)
            : undefined;
        if (
          messageContent.type === "tool-approval" &&
          previousMetadata?.roleId &&
          !resumedRole
        )
          throw new Error("Agent role no longer available");
        const selectedRole =
          resumedRole ??
          (await selectRole(
            agent,
            modelMessages,
            {
              model: await getChatModel(agent.modelIdentifier, {
                supabaseServiceRole,
                abortSignal,
                serverToken,
                websocketProvider,
              }),
              thinking,
            },
            {
              abortSignal,
              chatMessages: messages,
            },
          ));

        const selectedRoleModelIdentifier =
          selectedRole.modelIdentifierOverride ?? agent.modelIdentifier;

        await using toolSession = new AgentToolSession(
          claimedTask.parameters.activityId,
          claimedTask.parameters.agentId,
          selectedRole,
          {
            supabaseServiceRole,
            userId: claimedTask.parameters.userId,
            userClaims: claimedTask.parameters.userClaims,
            abortSignal,
            serverToken,
            supabase,
            websocketProvider,
          },
        );

        const timingStart = performance.now();
        let timingFirstResponse: number | undefined = undefined;

        const result = await streamText({
          abortSignal,
          instructions: selectedRole?.prompt,
          messages: modelMessages,
          model: await getChatModel(selectedRoleModelIdentifier, {
            supabaseServiceRole,
            abortSignal,
            serverToken,
            websocketProvider,
          }),
          reasoning: getReasoning(
            selectedRole?.modelThinkingOverride ?? agent.modelThinking,
            thinking,
          ),
          toolApproval: await toolSession.toolApproval(),
          tools: await toolSession.tools(),
        });

        let latestChatMessage: ChatMessage | undefined = undefined;
        const lastMessage = messages.at(-1);
        for await (const uiMessage of readUIMessageStream<ChatMessage>({
          message: lastMessage?.role === "assistant" ? lastMessage : undefined,
          stream: toUIMessageStream({
            generateMessageId: () => crypto.randomUUID(),
            originalMessages: messages,
            stream: result.stream,
          }),
          terminateOnError: true,
        })) {
          assertGenerationActive(true);
          if (!timingFirstResponse) {
            timingFirstResponse = performance.now();
          }

          latestChatMessage = {
            ...uiMessage,
            metadata: {
              ...uiMessage.metadata,
              roleId: selectedRole.id,
              roleName: selectedRole.name,
              thinking,
            },
          };
          updateChatMessage(chat.document, latestChatMessage);
        }

        if (latestChatMessage) {
          const timingEnd = performance.now();
          const inputDuration = timingFirstResponse
            ? timingFirstResponse - timingStart
            : undefined;
          const outputDuration = timingFirstResponse
            ? timingEnd - timingFirstResponse
            : undefined;

          const usage = await result.usage;
          assertGenerationActive();

          updateChatMessage(chat.document, {
            ...latestChatMessage,
            metadata: {
              ...latestChatMessage.metadata,
              timing:
                inputDuration && outputDuration
                  ? {
                      inputDuration,
                      outputDuration,
                      totalDuration: timingEnd - timingStart,
                    }
                  : undefined,
              usage,
            },
          });
        }

        // const generateLabel =

        // for (const activityDocument of activites.documents) {
        //   const thisActivityId = claimedTask.content.activityId;
        //   const thisActivity = getActivities(activityDocument)
        //     .activities?.toArray()
        //     .find((activity) => activity.id === thisActivityId);

        //   if (
        //     thisActivity?.label === labelOnInsert &&
        //     !thisActivity.labelUserInput
        //   ) {
        //   }
        // }
        await currentChatMessage.waitForSynced();
        claimedCurrentChatMessage = claimNextInput();
      }

      assertGenerationActive();
      setChatState(chat.document, {
        type: "idle",
      });
      activites.batch(upsertActivity, {
        id: claimedTask.parameters.activityId,
        state:
          getChatInteraction(getChat(chat.document).messages?.toArray() ?? [])
            .type === "tool-approval"
            ? "idle"
            : "success",
      });
    } catch (error) {
      const state = chat.document.getMap("state");
      // Recovery owns a lost lease. A late worker must not re-block the chat or
      // replace the state of a generation submitted after recovery.
      if (
        state.get("generationId") !== claimedTask.id ||
        !["queued", "generating", "aborting"].includes(
          String(state.get("type")),
        ) ||
        (abortSignal.aborted &&
          abortSignal.reason instanceof Error &&
          abortSignal.reason.message === "TASK_LEASE_LOST")
      )
        return;
      if (error instanceof Error && error.name === "AbortError") {
        // The Stop action releases the UI only after TaskQueue acknowledges
        // completion, which happens after these providers have been disposed.
        setChatState(chat.document, {
          generationId: claimedTask.id,
          type: abortSignal.aborted ? "aborting" : "idle",
        });
        if (!abortSignal.aborted)
          activites.batch(upsertActivity, {
            id: claimedTask.parameters.activityId,
            state: "idle",
          });
      } else {
        setChatState(chat.document, {
          error: error instanceof Error ? error.message : String(error),
          type: "error",
        });
        activites.batch(upsertActivity, {
          id: claimedTask.parameters.activityId,
          state: "error",
        });

        throw error;
      }
    }
  });
}
