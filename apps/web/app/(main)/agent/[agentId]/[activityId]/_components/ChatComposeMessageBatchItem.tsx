"use client";

import { ListVideo, Pause, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";
import { Button } from "@schornio/aibox-package-ui/components/button";
import type { TextMessage } from "@schornio/aibox-realtime/documents/chatCurrentMessage/_types";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useChatComposeMessage } from "./ChatComposeMessageContext";
import { useT } from "next-i18next/client";

export function ChatComposeMessageBatchItem({
  message,
  position,
}: {
  message: TextMessage;
  position: number;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatComposeMessageBatchItem",
  });
  const {
    activity,
    messageBatchDelete,
    selectedCurrentMessage,
    setMessageState,
    setSelectedCurrentMessageId,
  } = useChatComposeMessage();

  return (
    <div className="flex items-center gap-1" key={message.id}>
      <div className="w-[3ch] text-right text-sm tabular-nums">{position}.</div>
      <Button
        className={cn("flex-1 justify-start font-normal whitespace-normal", {
          "bg-primary/10 text-primary dark:bg-primary/80 dark:hover:bg-primary/50 hover:bg-primary/20 dark:text-white":
            message.id === selectedCurrentMessage?.id,
        })}
        onClick={() => {
          setSelectedCurrentMessageId(message.id);
        }}
        size="sm"
        variant="outline"
      >
        <span className="line-clamp-1">{message.content.text}</span>
      </Button>

      {activity?.state === "running" && message.state === "queued" ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                onClick={() => setMessageState(message.id, "paused")}
                size="icon-sm"
                variant="ghost"
              >
                <ListVideo />
              </Button>
            }
          />
          <TooltipContent>{t("tooltipWaiting")}</TooltipContent>
        </Tooltip>
      ) : undefined}

      {activity?.state === "running" && message.state === "paused" ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                onClick={() => setMessageState(message.id, "queued")}
                size="icon-sm"
                variant="ghost"
              >
                <Pause />
              </Button>
            }
          />
          <TooltipContent>{t("tooltipPaused")}</TooltipContent>
        </Tooltip>
      ) : undefined}

      {/* <Button size="icon-sm" variant="ghost">
        <Grip />
      </Button> */}

      <Button
        onClick={() => messageBatchDelete(message.id)}
        size="icon-sm"
        variant="destructive"
      >
        <X />
      </Button>
    </div>
  );
}
