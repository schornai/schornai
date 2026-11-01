"use client";

import { Button } from "@schornio/aibox-package-ui/components/button";
import { ChatComposeMessageBatchItem } from "./ChatComposeMessageBatchItem";
import { LayersPlus } from "lucide-react";
import { useChatComposeMessage } from "./ChatComposeMessageContext";
import { useRef } from "react";
import { useT } from "next-i18next/client";

export function ChatComposeMessageBatch() {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatComposeMessageBatch",
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messageBatch, messageBatchAdd, setSelectedCurrentMessageId } =
    useChatComposeMessage();

  return (
    <div className="scroll-fade-y flex max-h-[50vh] translate-y-0 flex-col gap-2 overflow-y-scroll p-2 opacity-100 transition-all starting:translate-y-5 starting:opacity-0">
      <Button
        className="mx-auto"
        onClick={() => {
          const { messageId } = messageBatchAdd();
          setSelectedCurrentMessageId(messageId);
          textareaRef.current?.focus();
        }}
        size="sm"
        variant="outline"
      >
        {t("labelNewMessage")} <LayersPlus />
      </Button>
      {messageBatch.toReversed().map((message, index) => (
        <ChatComposeMessageBatchItem
          key={message.id}
          message={message}
          position={messageBatch.length - index}
        />
      ))}
    </div>
  );
}
