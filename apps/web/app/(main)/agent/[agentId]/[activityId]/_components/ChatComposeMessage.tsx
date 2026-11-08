"use client";

import {
  Collapsible,
  CollapsibleContent,
} from "@schornio/aibox-package-ui/components/collapsible";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import { ChatComposeMessageBatch } from "./ChatComposeMessageBatch";
import { ChatComposeMessageSelected } from "./ChatComposeMessageSelected";
import { ChatToolApproval } from "./ChatToolApproval";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ExhaustiveError } from "@schornio/aibox-package-utils/ExhaustiveError";
import { useChatComposeMessage } from "./ChatComposeMessageContext";
import { useState, useRef, useEffect, useEffectEvent } from "react";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { useT } from "next-i18next/client";
import { getResponseSuggestions } from "@schornio/aibox-realtime/documents/chat/getResponseSuggestions";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { useMessages } from "./ChatContext";

export function ChatComposeMessage({
  agentColor,
  recommendedMessages = [],
}: {
  agentColor?: AppColor;
  recommendedMessages?: Agent["recommendedMessages"];
}) {
  const { interaction } = useChatComposeMessage();

  return (
    <ContainerMain className="z-10 pt-0 shadow-[0_-3px_8px_0_var(--background),0_-10px_20px_1px_var(--background)]">
      <ChatInteractionContent
        agentColor={agentColor}
        interaction={interaction}
        recommendedMessages={recommendedMessages}
      />
    </ContainerMain>
  );
}

function ChatInteractionContent({
  agentColor,
  interaction,
  recommendedMessages,
}: {
  agentColor?: AppColor;
  recommendedMessages: Agent["recommendedMessages"];
  interaction: ReturnType<typeof useChatComposeMessage>["interaction"];
}) {
  switch (interaction.type) {
    case "message-batch":
      return (
        <ChatMessageBatchInput
          agentColor={agentColor}
          recommendedMessages={recommendedMessages}
        />
      );
    case "tool-approval":
      return (
        <ChatToolApproval
          agentColor={agentColor}
          key={interaction.request.approvalId}
          request={interaction.request}
        />
      );
    default:
      throw new ExhaustiveError(interaction);
  }
}

function ChatMessageBatchInput({
  agentColor,
  recommendedMessages,
}: {
  agentColor?: AppColor;
  recommendedMessages: Agent["recommendedMessages"];
}) {
  const [batchViewOpen, setBatchViewOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messages = useMessages();
  const suggestions = getResponseSuggestions(messages);
  const { t } = useT("agent", { keyPrefix: "_components.ChatComposeMessage" });
  const { activityId, selectedCurrentMessage, setSelectedCurrentMessageText } =
    useChatComposeMessage();
  const applyRecommendedMessage = (text: string) => {
    setSelectedCurrentMessageText(text);
    textareaRef.current?.focus();
  };
  const applyHashRecommendation = useEffectEvent(() => {
    if (selectedCurrentMessage?.state === "submitted") return;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const recommendation = recommendedMessages.find(
      (message) => message.id === hash.get("recommendedMessage"),
    );
    if (!recommendation) return;
    applyRecommendedMessage(recommendation.message);
    hash.delete("recommendedMessage");
    const remainingHash = hash.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}${remainingHash ? `#${remainingHash}` : ""}`,
    );
  });
  useEffect(() => {
    applyHashRecommendation();
    window.addEventListener("hashchange", applyHashRecommendation);
    return () =>
      window.removeEventListener("hashchange", applyHashRecommendation);
  }, [activityId, recommendedMessages, selectedCurrentMessage?.state]);

  return (
    <>
      {messages.length === 0 && recommendedMessages.length > 0 ? (
        <div
          className="mb-3 flex flex-wrap justify-center gap-2"
          role="group"
          aria-label={t("labelRecommendedMessages")}
        >
          {recommendedMessages.map((recommendation) => (
            <ContainerStyled
              key={recommendation.id}
              appColor={agentColor}
              variant="card"
              interactive
              className="flex min-h-20 w-60 max-w-full flex-col items-start gap-1 text-left disabled:cursor-not-allowed disabled:opacity-50"
              render={
                <button
                  type="button"
                  disabled={selectedCurrentMessage?.state === "submitted"}
                  onClick={() =>
                    applyRecommendedMessage(recommendation.message)
                  }
                />
              }
            >
              {recommendation.label ? (
                <strong className="text-sm">{recommendation.label}</strong>
              ) : null}
              <span className="line-clamp-2 text-xs">
                {recommendation.message}
              </span>
            </ContainerStyled>
          ))}
        </div>
      ) : null}
      {suggestions.length > 0 && (
        <div
          className="mb-3 flex flex-wrap gap-2"
          role="group"
          aria-label={t("labelResponseSuggestions")}
        >
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              type="button"
              variant="outline"
              className="h-auto max-w-full text-left wrap-anywhere whitespace-normal"
              disabled={selectedCurrentMessage?.state === "submitted"}
              onClick={() =>
                applyRecommendedMessage(
                  selectedCurrentMessage?.content.text
                    ? `${selectedCurrentMessage.content.text}\n${suggestion}`
                    : suggestion,
                )
              }
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
      <Collapsible open={batchViewOpen} onOpenChange={setBatchViewOpen}>
        <div className="bg-muted rounded-lg border">
          <CollapsibleContent>
            <ChatComposeMessageBatch />
          </CollapsibleContent>
          <ChatComposeMessageSelected inputRef={textareaRef} />
        </div>
      </Collapsible>
    </>
  );
}
