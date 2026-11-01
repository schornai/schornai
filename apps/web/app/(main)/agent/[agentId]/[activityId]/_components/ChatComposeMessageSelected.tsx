"use client";

import {
  Brain,
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
import { useEffect, useRef, useState } from "react";
import { AudioRecorderButton } from "../../../../../_components/AudioRecorderModal";
import { AttachmentGroup } from "@schornio/aibox-package-ui/components/attachment";
import { Button } from "@schornio/aibox-package-ui/components/button";
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

export function ChatComposeMessageSelected({
  className,
}: {
  className?: string;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatComposeMessageSelected",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [syncError, setSyncError] = useState(false);

  const { queueFileUploadsByFileList, uploads = [] } = useFileUpload();

  const {
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
        if (submittingRef.current || isSubmitted || filesPending) return;
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
                    {messageBatch.length > 1 ? messageBatch.length : undefined}
                  </Button>
                }
              />
            }
          />
          <TooltipContent>{t("labelMessageStack")}</TooltipContent>
        </Tooltip>
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

        <AudioRecorderButton
          iconOnly
          disabled={selectedCurrentMessage?.state === "submitted"}
        />

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

          {!isSubmitted && messageBatchPaused.length > 1 ? (
            <Button
              disabled={filesPending}
              name="batch"
              size="sm"
              type="submit"
              variant="ghost"
            >
              {t("buttonStartBatch")} <Play />
            </Button>
          ) : undefined}

          <Button
            disabled={isSubmitted || filesPending}
            name="next"
            size="sm"
            type="submit"
            variant="ghost"
          >
            {t("buttonSend")} <SendHorizonal />
          </Button>
        </div>
      </div>
    </form>
  );
}
