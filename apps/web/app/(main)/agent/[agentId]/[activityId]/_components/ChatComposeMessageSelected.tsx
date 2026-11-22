"use client";

import {
  Brain,
  Mic,
  MicOff,
  File,
  Upload,
  Layers,
  Paperclip,
  Pause,
  Play,
  SendHorizonal,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";
import { StoragePickerDialog } from "../../../../../_components/StoragePickerDialog";
import { storageSelectChatFile } from "../../../../../_actions/storageSelectChatFile";
import { storageToAppBasePath } from "@/lib/storageToAppBasePath";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useDecayState } from "@schornio/aibox-package-ui/hooks/use-decay-state";
import { voiceTranscriberErrorKeys } from "@/lib/voiceTranscriberStatus";
import { ChatVoiceRecorder } from "./ChatVoiceRecorder";
import { useCanSendMessage } from "./ChatContext";
import { AttachmentGroup } from "@schornio/aibox-package-ui/components/attachment";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ChatExpirationSettings } from "./ChatExpirationSettings";
import { ChatCancelGeneration } from "./ChatCancelGeneration";
import { CollapsibleTrigger } from "@schornio/aibox-package-ui/components/collapsible";
import { StorageObjectTile } from "../../../../../_components/StorageObjectTile";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { submitCurrentMessage } from "../_actions/submitCurrentMessage";
import { useAction } from "next-safe-action/hooks";
import { useChatComposeMessage } from "./ChatComposeMessageContext";
import { useFileUpload } from "../../../../../_components/FileUploadProvider";
import { useStorageView } from "../../../../../_components/StorageViewProvider";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { useT } from "next-i18next/client";

import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import type { TextMessage } from "@schornio/aibox-realtime/documents/chatCurrentMessage/_types";

function hasMessageContent(message?: TextMessage) {
  return Boolean(
    message?.content.text?.trim() || message?.content.files?.length,
  );
}

export function ChatComposeMessageSelected({
  agentColor,
  className,
  inputRef,
}: {
  className?: string;
  agentColor?: AppColor;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatComposeMessageSelected",
  });
  const { t: voiceLabel } = useT("agent", {
    keyPrefix: "_components.VoiceMessage",
  });
  const [voiceOpen, setVoiceOpen] = useState<"record" | "prompt" | null>(null);
  const [voiceSent, setVoiceSent] = useDecayState(false);
  const canSend = useCanSendMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const fallbackTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef ?? fallbackTextareaRef;
  const submittingRef = useRef(false);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [syncError, setSyncError] = useState(false);

  const { queueFileUploadsByFileList, uploads = [] } = useFileUpload();

  const {
    additionalFunctions,
    voiceStatus,
    expiration,
    activity,
    addSelectedFiles,
    activityId,
    agentId,
    defaultThinking,
    messageBatch,
    selectedCurrentMessage,
    setMessageBatchState,
    setMessageState,
    setFirstCurrentMessageSubmitted,
    setSelectedCurrentMessageText,
    setSelectedCurrentMessageThinking,
    waitForSubmittedChanges,
  } = useChatComposeMessage();

  const {
    basePathApp,
    storage,
    itemGroups,
    pendingFilePaths = [],
  } = useStorageView();

  const voiceEnabled = voiceStatus === "ready";
  const { executeAsync, hasErrored } = useAction(submitCurrentMessage);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [selectedCurrentMessage?.id]);

  const messageBatchQueue = messageBatch.filter(
    (message) => message.state === "queued",
  );

  const messageBatchPaused = messageBatch.filter(
    (message) => message.state === "paused",
  );

  const isSubmitted =
    messageBatch.some((message) => message.state === "submitted") ||
    activity?.state === "running";

  const attachedPaths = new Set(
    messageBatch.flatMap(
      (message) =>
        message.content.files
          ?.filter((file) => !file.attachment)
          .map((file) => resolvePath(file.path)) ?? [],
    ),
  );
  const filesPending =
    uploads.some(
      (upload) => upload.state === "queued" || upload.state === "uploading",
    ) || pendingFilePaths.some((path) => attachedPaths.has(resolvePath(path)));

  const nextHasContent = hasMessageContent(messageBatch[0]);
  const showMicrophone =
    voiceEnabled &&
    !filesPending &&
    !nextHasContent &&
    !hasMessageContent(selectedCurrentMessage);
  const sendDisabled = isSubmitted || filesPending || !nextHasContent;
  useEffect(() => {
    if (!voiceEnabled || !canSend || isSubmitted) return;
    const openFromHash = () => {
      if (window.location.hash === "#record") {
        setVoiceOpen("prompt");
        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname + window.location.search,
        );
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [voiceEnabled, canSend, isSubmitted]);

  if (voiceEnabled && voiceOpen)
    return (
      <ChatVoiceRecorder
        key={activityId}
        autoStart={voiceOpen === "record"}
        agentColor={agentColor}
        agentId={agentId}
        activityId={activityId}
        thinking={selectedCurrentMessage?.content.thinking ?? defaultThinking}
        onClose={(sent) => {
          setVoiceSent(sent);
          setVoiceOpen(null);
        }}
      />
    );

  return (
    <form
      className={cn(
        "bg-background ring-muted-foreground rounded-lg focus-within:ring-1",
        className,
        {
          "ring-destructive ring-1": hasErrored || syncError,
        },
      )}
      onSubmit={(event) => {
        event.preventDefault();
        if (submittingRef.current || sendDisabled) return;
        submittingRef.current = true;
        setSyncError(false);
        const previousStates = messageBatch.map(({ id, state }) => ({
          id,
          state,
        }));

        if (event.submitter?.getAttribute("name") === "batch") {
          setMessageBatchState("queued");
        }

        const submittedMessageId = setFirstCurrentMessageSubmitted();
        if (!previousStates.some(({ id }) => id === submittedMessageId)) {
          previousStates.push({ id: submittedMessageId, state: "paused" });
        }
        waitForSubmittedChanges()
          .then(async () => {
            const result = await executeAsync({ activityId, agentId });
            if (result?.serverError || result?.validationErrors) {
              throw new Error("Chat submission failed", {
                cause: result.serverError ?? result.validationErrors,
              });
            }
          })
          .catch((error) => {
            for (const { id, state } of previousStates) {
              setMessageState(id, state);
            }
            setSyncError(true);
            logError("ChatComposeMessageSelected", error);
          })
          .finally(() => {
            submittingRef.current = false;
          });
      }}
      ref={formRef}
    >
      {(selectedCurrentMessage?.content.files?.length ?? 0) > 0 ? (
        <div className="overflow-hidden px-1">
          <AttachmentGroup>
            {itemGroups[0]?.[1]?.map((file) => (
              <StorageObjectTile
                basePathApp={
                  file.attachment
                    ? storageToAppBasePath(file.attachment.storage)
                    : basePathApp
                }
                key={file.attachment?.agentPath ?? file.path}
                storage={file.attachment?.storage ?? storage}
                className="w-72"
                storageObject={file}
                variant="tiles-small"
              />
            ))}
          </AttachmentGroup>
        </div>
      ) : undefined}
      {voiceStatus && voiceStatus !== "ready" && (
        <p
          role="status"
          className="text-muted-foreground flex items-start gap-2 px-3 pt-2 text-xs"
        >
          <MicOff aria-hidden="true" className="size-4 shrink-0" />
          {voiceLabel(voiceTranscriberErrorKeys[voiceStatus])}
        </p>
      )}
      {voiceSent && (
        <p role="status" className="text-muted-foreground px-3 pt-2 text-xs">
          {voiceLabel("descriptionQueued")}
        </p>
      )}
      <Textarea
        className="max-h-[40vh] min-h-[2ch] resize-none border-none bg-transparent! focus-visible:ring-0"
        disabled={selectedCurrentMessage?.state === "submitted"}
        onChange={({ currentTarget: { value } }) =>
          setSelectedCurrentMessageText(value)
        }
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        placeholder={t("placeholderMessage")}
        ref={textareaRef}
        value={selectedCurrentMessage?.content.text ?? ""}
      />

      {filesPending ? (
        <p role="status" className="text-muted-foreground px-3 pb-1 text-xs">
          {t("descriptionFilesPending")}
        </p>
      ) : null}
      <div className="flex items-center gap-0.5 p-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                className={cn({
                  "bg-primary/10 text-primary dark:bg-primary/80 dark:hover:bg-primary/50 hover:bg-primary/20 px-0.5 dark:text-white":
                    selectedCurrentMessage?.content.thinking ?? defaultThinking,
                })}
                disabled={selectedCurrentMessage?.state === "submitted"}
                onClick={() =>
                  setSelectedCurrentMessageThinking(
                    !(
                      selectedCurrentMessage?.content.thinking ??
                      defaultThinking
                    ),
                  )
                }
                size="icon-sm"
                variant="ghost"
              >
                <Brain />
              </Button>
            }
          />
          <TooltipContent>
            {(selectedCurrentMessage?.content.thinking ?? defaultThinking)
              ? t("labelThinkingOn")
              : t("labelThinkingOff")}
          </TooltipContent>
        </Tooltip>
        {additionalFunctions?.batch !== false ? (
          <Tooltip>
            <CollapsibleTrigger
              render={
                <TooltipTrigger
                  render={
                    <Button
                      className="aria-expanded:bg-primary/10 aria-expanded:text-primary aria-expanded:dark:bg-primary/80 aria-expanded:dark:hover:bg-primary/50 aria-expanded:hover:bg-primary/20 px-0.5 aria-expanded:dark:text-white"
                      size={messageBatch.length > 1 ? "sm" : "icon-sm"}
                      variant="ghost"
                    >
                      <Layers className="size-4" />{" "}
                      {messageBatch.length > 1
                        ? messageBatch.length
                        : undefined}
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>{t("labelMessageStack")}</TooltipContent>
          </Tooltip>
        ) : null}
        {additionalFunctions?.fileUpload !== false ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t("labelAttachFiles")}
                    disabled={selectedCurrentMessage?.state === "submitted"}
                  />
                }
              >
                <Paperclip />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => uploadRef.current?.click()}>
                    <Upload />
                    {t("labelUploadFiles")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilePickerOpen(true)}>
                    <File />
                    {t("labelSelectFile")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={uploadRef}
              className="hidden"
              multiple
              type="file"
              onChange={({ currentTarget }) => {
                queueFileUploadsByFileList(currentTarget.files);
                currentTarget.value = "";
              }}
            />
            <StoragePickerDialog
              open={filePickerOpen}
              onOpenChange={setFilePickerOpen}
              mode="file"
              currentStorage={activity ? storage : undefined}
              onSelect={async (selection) => {
                const result = await storageSelectChatFile({
                  agentId,
                  activityId,
                  storage: selection.storage,
                  path: selection.path,
                });
                if (!result?.data?.file)
                  throw new Error(result?.data?.error ?? "SELECT_FILE_FAILED");
                addSelectedFiles([result.data.file]);
              }}
            />
          </>
        ) : null}

        {(additionalFunctions?.disappearingChats !== false ||
          expiration?.expiresAt) &&
        expiration ? (
          <ChatExpirationSettings
            agentId={agentId}
            activityId={activityId}
            expiration={expiration}
          />
        ) : null}

        <div className="ml-auto flex items-center gap-0.5">
          <ChatCancelGeneration />

          {isSubmitted && messageBatchQueue.length > 0 ? (
            <Button
              onClick={() => {
                setMessageBatchState("paused");
              }}
              size="sm"
              variant="ghost"
            >
              {t("buttonPause")} <Pause />
            </Button>
          ) : undefined}

          {additionalFunctions?.batch !== false &&
          !isSubmitted &&
          messageBatchPaused.length > 1 ? (
            <Button
              disabled={sendDisabled}
              name="batch"
              size="sm"
              type="submit"
              variant="ghost"
            >
              {t("buttonStartBatch")} <Play />
            </Button>
          ) : undefined}
          {showMicrophone ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title={voiceLabel("labelRecord")}
              disabled={!canSend || isSubmitted}
              onClick={() => setVoiceOpen("record")}
            >
              {voiceLabel("buttonRecord")} <Mic />
            </Button>
          ) : (
            <Button
              disabled={sendDisabled}
              name="next"
              size="sm"
              type="submit"
              variant="ghost"
            >
              {t("buttonSend")} <SendHorizonal />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
