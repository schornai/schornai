"use client";
import { PlatformToolPreview } from "./PlatformToolPreview";
import { ChatMCPAuthorization } from "./ChatMCPAuthorization";
import { ChatToolApprovalStorageTransferFile } from "./ChatToolApprovalStorageTransferFile";

import { Check, DraftingCompass, ShieldCheck, X } from "lucide-react";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ChatCancelGeneration } from "./ChatCancelGeneration";
import { ChatToolApprovalContent } from "./ChatToolApprovalContent";
import { ChatToolApprovalWebFetch } from "./ChatToolApprovalWebFetch";
import { ChatToolApprovalWebSearch } from "./ChatToolApprovalWebSearch";
import { ChatToolApprovalStorageWriteFile } from "./ChatToolApprovalStorageWriteFile";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import type { ToolApprovalRequest } from "@schornio/aibox-realtime/documents/chat/getChatInteraction";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { submitCurrentMessage } from "../_actions/submitCurrentMessage";
import { useAction } from "next-safe-action/hooks";
import { useCanSendMessage } from "./ChatContext";
import { useChatComposeMessage } from "./ChatComposeMessageContext";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function ChatToolApproval({
  agentColor,
  request,
}: {
  agentColor?: AppColor;
  request: ToolApprovalRequest;
}) {
  const { t } = useT("agent", { keyPrefix: "_components.ChatToolApproval" });
  const {
    activityId,
    agentId,
    approvalSubmitted,
    submitToolApproval,
    waitForSubmittedChanges,
  } = useChatComposeMessage();
  const [syncError, setSyncError] = useState(false);
  const canSend = useCanSendMessage();
  const { executeAsync, isPending, hasErrored } =
    useAction(submitCurrentMessage);
  const disabled = !canSend || isPending || approvalSubmitted;
  const resume = () => {
    setSyncError(false);
    void waitForSubmittedChanges()
      .then(() => executeAsync({ activityId, agentId }))
      .catch((error) => {
        setSyncError(true);
        logError("ChatToolApproval", error);
      });
  };
  const submit = (approved: boolean) => {
    submitToolApproval({ approvalId: request.approvalId, approved });
    resume();
  };

  return (
    <ContainerStyled
      appColor={agentColor}
      className="bg-background dark:bg-background rounded-lg border border-(--color-default) shadow-[0_0_24px_2px_color-mix(in_oklab,var(--color-default)_35%,transparent)] ring-(--color-default) focus-within:ring-1"
    >
      <ChatToolApprovalDetails request={request} />
      {hasErrored || syncError ? (
        <p className="text-destructive px-3 text-sm" role="alert">
          {t("errorSubmit")}
        </p>
      ) : undefined}
      <div className="flex items-center justify-end gap-1 p-1">
        <ChatCancelGeneration />
        {(hasErrored || syncError) && approvalSubmitted ? (
          <Button
            disabled={!canSend || isPending}
            onClick={resume}
            size="sm"
            variant="ghost"
          >
            {t("labelRetry")}
          </Button>
        ) : approvalSubmitted || isPending ? (
          <p className="text-muted-foreground px-2 py-1 text-sm" role="status">
            {t("labelSubmitting")}
          </p>
        ) : (
          <>
            <Button
              disabled={disabled}
              onClick={() => submit(false)}
              size="sm"
              variant="destructive"
            >
              <X />
              {t("labelReject")}
            </Button>
            {request.toolName === "mcp" ? (
              <ChatMCPAuthorization
                agentId={agentId}
                activityId={activityId}
                approvalId={request.approvalId}
                mcpId={String(
                  (request.input as { serverId?: unknown })?.serverId ?? "",
                )}
                disabled={disabled}
              />
            ) : (
              <Button
                disabled={disabled}
                onClick={() => submit(true)}
                size="sm"
                variant="default"
              >
                <Check />
                {t("labelApprove")}
              </Button>
            )}
          </>
        )}
      </div>
    </ContainerStyled>
  );
}

// Register additional tool-specific approval components here.
function ChatToolApprovalDetails({
  request,
}: {
  request: ToolApprovalRequest;
}) {
  const { t } = useT("agent", { keyPrefix: "_components.ChatToolApproval" });
  const { t: platformT } = useT("agent", {
    keyPrefix: "_components.PlatformToolPreview",
  });
  if (request.toolName.startsWith("platform_"))
    return (
      <ChatToolApprovalContent
        description={t("descriptionAction")}
        icon={<DraftingCompass />}
        title={platformT(`tools.${request.toolName}`, {
          defaultValue: request.toolName,
        })}
      >
        <PlatformToolPreview
          toolName={request.toolName}
          value={request.input}
        />
      </ChatToolApprovalContent>
    );
  switch (request.toolName) {
    case "mcp":
      return (
        <ChatToolApprovalContent
          description={t("descriptionMCP")}
          icon={<ShieldCheck className="size-4" />}
          title={t("labelMCP")}
        />
      );
    case "storage-copy-file":
    case "storage-move-file":
      return (
        <ChatToolApprovalStorageTransferFile
          input={request.input}
          move={request.toolName === "storage-move-file"}
        />
      );
    case "web-fetch":
      return <ChatToolApprovalWebFetch input={request.input} />;
    case "web-search":
      return <ChatToolApprovalWebSearch input={request.input} />;
    case "storage-write-file":
      return <ChatToolApprovalStorageWriteFile input={request.input} />;
    default:
      return (
        <ChatToolApprovalContent
          description={t("descriptionAction")}
          icon={<ShieldCheck className="size-4" />}
          title={t("labelTitle")}
        />
      );
  }
}
