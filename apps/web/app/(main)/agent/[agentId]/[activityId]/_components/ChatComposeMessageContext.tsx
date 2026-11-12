"use client";
import type { ChatExpiration } from "@schornio/aibox-package-database/chat/expirationSchema";
import type { StorageRealtimeObject } from "@schornio/aibox-realtime/documents/storage/_types";
import type { AudioRecordingConfig } from "../../../../../_components/AudioRecorderModal";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext } from "react";
import type { Activity } from "@schornio/aibox-realtime/documents/activity/_types";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { ChatInteraction } from "@schornio/aibox-realtime/documents/chat/getChatInteraction";
import type { FileUpload } from "../../../../../_components/FileUploadProvider";
import { FileUploadDropZone } from "../../../../../_components/FileUploadDropZone";
import type { Message } from "@schornio/aibox-realtime/documents/chatCurrentMessage/_types";
import { RealtimeRoom } from "@/lib/RealtimeRoom";
import { StorageContext } from "../../../../../_components/StorageContext";
import type { TextMessage } from "@schornio/aibox-realtime/documents/chatCurrentMessage/_types";
import { addChatCurrentMessage } from "@schornio/aibox-realtime/documents/chatCurrentMessage/addChatCurrentMessage";
import { addChatCurrentMessageFiles } from "@schornio/aibox-realtime/documents/chatCurrentMessage/addChatCurrentMessageFiles";
import { deleteChatCurrentMessage } from "@schornio/aibox-realtime/documents/chatCurrentMessage/deleteChatCurrentMessage";
import { fileUploadToStorageObjectAction } from "../../../../../_models/fileUploadToStorageObjectAction";
import { getChatCurrentMessageBatch } from "@schornio/aibox-realtime/documents/chatCurrentMessage/getChatCurrentMessageBatch";
import { getChatCurrentMessageDocumentName } from "@schornio/aibox-realtime/documents/chatCurrentMessage/_utils";
import { getChatInteraction } from "@schornio/aibox-realtime/documents/chat/getChatInteraction";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { normalizeChatCurrentMessage } from "@schornio/aibox-realtime/documents/chatCurrentMessage/normalizeChatCurrentMessage";
import { omitNullish } from "@schornio/aibox-package-utils/omitNullish";
import { patchChatCurrentMessage } from "@schornio/aibox-realtime/documents/chatCurrentMessage/patchChatCurrentMessage";
import { setChatCurrentMessageState } from "@schornio/aibox-realtime/documents/chatCurrentMessage/setChatCurrentMessageState";
import { useActivites } from "../../../../_components/ActivityContextProvider";
import { useHocuspocusProvider } from "@hocuspocus/provider-react";
import { useMessages } from "./ChatContext";
import { useRealtimeArray } from "@/lib/useRealtimeArray";
import { useState } from "react";
import { waitForProviderSynced } from "@schornio/aibox-realtime/_lib/waitForProviderSynced";

const context = createContext<
  | {
      activity?: Activity;
      activityId: string;
      agentId: string;
      additionalFunctions?: Agent["additionalFunctions"];
      expiration?: ChatExpiration;
      // chatGenerationAbort: () => void;
      // chatGenerationPause: () => void;
      // chatGenerationStart: () => void;
      defaultThinking: boolean;
      interaction: ChatInteraction;
      approvalSubmitted: boolean;
      submitToolApproval: (approval: {
        approvalId: string;
        approved: boolean;
      }) => void;
      messageBatch: TextMessage[];
      messageBatchAdd: () => { messageId: string };
      messageBatchDelete: (messageId: string) => void;
      selectedCurrentMessage?: TextMessage;
      setMessageBatchState: (state: Message["state"]) => void;
      setMessageState: (messageId: string, state: Message["state"]) => void;
      setSelectedCurrentMessageId: Dispatch<SetStateAction<string | undefined>>;
      setFirstCurrentMessageSubmitted: () => string;
      addSelectedFiles: (files: StorageRealtimeObject[]) => void;
      setSelectedCurrentMessageText: (text: string) => void;
      setSelectedCurrentMessageThinking: (thinking?: boolean) => void;
      waitForSubmittedChanges: () => Promise<void>;
    }
  | undefined
>(undefined);

function ChatComposeMessageContextProvider({
  activityId,
  agentId,
  modelThinking,
  additionalFunctions,
  expiration,
  audioRecording,
  children,
}: {
  activityId: string;
  agentId: string;
  modelThinking?: Agent["modelThinking"];
  additionalFunctions?: Agent["additionalFunctions"];
  expiration?: ChatExpiration;
  audioRecording?: AudioRecordingConfig;
  children: ReactNode;
}) {
  const [selectedCurrentMessageId, setSelectedCurrentMessageId] = useState<
    string | undefined
  >();

  const { activities } = useActivites();
  const activity = activities.find((activity) => activity.id === activityId);

  const provider = useHocuspocusProvider();

  const messageBatchYArray = getChatCurrentMessageBatch(provider.document);
  const inputs = useRealtimeArray(messageBatchYArray).map(
    normalizeChatCurrentMessage,
  );
  const messageBatch = inputs.filter(
    (input): input is TextMessage => input.content.type === "text",
  );
  const interaction = getChatInteraction(useMessages());
  const approvalSubmitted = inputs.some(
    (input) => input.content.type === "tool-approval",
  );
  const submitToolApproval = (approval: {
    approvalId: string;
    approved: boolean;
  }) => {
    if (
      interaction.type !== "tool-approval" ||
      messageBatchYArray
        .toArray()
        .map(normalizeChatCurrentMessage)
        .some((input) => input.content.type === "tool-approval")
    )
      return;
    provider.document.transact(() => {
      const { messageId } = addChatCurrentMessage(provider.document, {
        ...approval,
        type: "tool-approval",
      });
      setChatCurrentMessageState(provider.document, messageId, "submitted");
    });
  };

  const addChatCurrentMessageDefault = (
    ...[document, message]: Parameters<typeof addChatCurrentMessage>
  ) => {
    return addChatCurrentMessage(document, {
      ...message,

      thinking:
        message.thinking ??
        (modelThinking === "mandatory-on" || modelThinking === "optional-on"),
    });
  };

  const messageBatchAdd = () => {
    return addChatCurrentMessageDefault(provider.document, {
      text: "",
      type: "text",
    });
  };

  const messageBatchDelete = (messageId: string) => {
    deleteChatCurrentMessage(provider.document, messageId);
  };

  const setMessageBatchState = (state: Message["state"]) => {
    provider.document.transact(() => {
      for (const message of messageBatch)
        setChatCurrentMessageState(provider.document, message.id, state);
    });
  };

  const setMessageState = (messageId: string, state: Message["state"]) => {
    setChatCurrentMessageState(provider.document, messageId, state);
  };

  const firstCurrentMessage = messageBatch[0];

  const selectedCurrentMessage =
    messageBatch.find((message) => message.id === selectedCurrentMessageId) ??
    firstCurrentMessage;

  const setFirstCurrentMessageSubmitted = () => {
    if (firstCurrentMessage) {
      setChatCurrentMessageState(
        provider.document,
        firstCurrentMessage.id,
        "submitted",
      );
      return firstCurrentMessage.id;
    } else {
      const { messageId } = addChatCurrentMessageDefault(provider.document, {
        text: "",
        type: "text",
      });
      setChatCurrentMessageState(provider.document, messageId, "submitted");
      setSelectedCurrentMessageId(messageId);
      return messageId;
    }
  };

  const setSelectedCurrentMessageText = (text: string) => {
    if (selectedCurrentMessage) {
      patchChatCurrentMessage(provider.document, selectedCurrentMessage.id, {
        text,
        type: "text",
      });
    } else {
      const { messageId } = addChatCurrentMessageDefault(provider.document, {
        text,
        type: "text",
      });
      setSelectedCurrentMessageId(messageId);
    }
  };

  const setSelectedCurrentMessageThinking = (thinking?: boolean) => {
    if (modelThinking === "mandatory-off" || modelThinking === "mandatory-on") {
      return;
    }

    if (selectedCurrentMessage) {
      patchChatCurrentMessage(provider.document, selectedCurrentMessage.id, {
        thinking,
        type: "text",
      });
    } else {
      const { messageId } = addChatCurrentMessageDefault(provider.document, {
        text: "",
        thinking,
        type: "text",
      });
      setSelectedCurrentMessageId(messageId);
    }
  };

  const addSelectedCurrentMessageFiles = (fileUploads: FileUpload[]) => {
    addSelectedFiles(
      fileUploads
        .map(fileUploadToStorageObjectAction)
        .filter(omitNullish)
        .map((action) => action.target),
    );
  };
  const addSelectedFiles = (files: StorageRealtimeObject[]) => {
    if (interaction.type !== "message-batch") return;
    if (selectedCurrentMessage) {
      addChatCurrentMessageFiles(
        provider.document,
        selectedCurrentMessage.id,
        files,
      );
    } else {
      const { messageId } = addChatCurrentMessageDefault(provider.document, {
        files,
        text: "",
        type: "text",
      });
      setSelectedCurrentMessageId(messageId);
    }
  };

  return (
    <context.Provider
      value={{
        activity,
        addSelectedFiles,
        activityId,
        agentId,
        additionalFunctions,
        expiration,
        approvalSubmitted,
        defaultThinking:
          modelThinking === "mandatory-on" || modelThinking === "optional-on",
        interaction,
        messageBatch,
        messageBatchAdd,
        messageBatchDelete,
        selectedCurrentMessage,
        setFirstCurrentMessageSubmitted,
        setMessageBatchState,
        setMessageState,
        setSelectedCurrentMessageId,
        setSelectedCurrentMessageText,
        setSelectedCurrentMessageThinking,
        submitToolApproval,
        waitForSubmittedChanges: () =>
          waitForProviderSynced(provider, {
            abortSignal: AbortSignal.timeout(30_000),
          }),
      }}
    >
      <StorageContext
        audioRecording={audioRecording}
        applyNewFiles="ignore"
        basePathApp={`/agent/${agentId}/${activityId}/files`}
        basePathStorage="/"
        beforeUpload={addSelectedCurrentMessageFiles}
        id="not_set"
        storage={{ activityId, agentId, type: "activity" }}
        storageObjects={selectedCurrentMessage?.content.files ?? []}
        userPreferences={{}}
      >
        {interaction.type === "message-batch" ? (
          <FileUploadDropZone
            className="flex flex-col"
            disabled={additionalFunctions?.fileUpload === false}
          >
            {children}
          </FileUploadDropZone>
        ) : (
          children
        )}
      </StorageContext>
    </context.Provider>
  );
}

export function ChatComposeMessageContext({
  activityId,
  agentId,
  modelThinking,
  additionalFunctions,
  expiration,
  audioRecording,
  children,
}: {
  activityId: string;
  agentId: string;
  modelThinking?: Agent["modelThinking"];
  additionalFunctions?: Agent["additionalFunctions"];
  expiration?: ChatExpiration;
  audioRecording?: AudioRecordingConfig;
  children?: ReactNode;
}) {
  return (
    <RealtimeRoom
      name={getChatCurrentMessageDocumentName({ activityId, agentId })}
    >
      <ChatComposeMessageContextProvider
        activityId={activityId}
        agentId={agentId}
        modelThinking={modelThinking}
        additionalFunctions={additionalFunctions}
        expiration={expiration}
        audioRecording={audioRecording}
      >
        {children}
      </ChatComposeMessageContextProvider>
    </RealtimeRoom>
  );
}

export function useChatComposeMessage() {
  const current = useContext(context);
  if (!current) {
    const error = new Error("Must be used inside a ChatComposeMessageContext");
    logError("ChatComposeMessageContext", error);
    throw error;
  }
  return current;
}
