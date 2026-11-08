"use client";
import { Calculator, Clock, MessageSquareQuote, Tag } from "lucide-react";
import { useT } from "next-i18next/client";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import { ChatMessagePartToolWebLayout } from "./ChatMessagePartToolWebLayout";

export function ChatMessagePartToolSupport({
  agentColor,
  part,
}: {
  agentColor?: AppColor;
  part: Extract<
    ChatMessage["parts"][number],
    {
      type:
        | "tool-calculator"
        | "tool-chat-set-label"
        | "tool-chat-current-date-time"
        | "tool-chat-response-suggestions";
    }
  >;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatMessagePartToolSupport",
  });
  let input = "";
  let content;
  let icon;
  switch (part.type) {
    case "tool-calculator":
      input = part.input?.expression ?? "";
      icon = <Calculator />;
      content = part.output?.ok && (
        <p>
          {part.output.expression} = <strong>{part.output.result}</strong>
        </p>
      );
      break;
    case "tool-chat-set-label":
      input = part.input?.label ?? "";
      icon = <Tag />;
      content = part.output?.ok && (
        <p>
          {part.output.label}
          {!part.output.updated && ` · ${t("labelManualTitlePreserved")}`}
        </p>
      );
      break;
    case "tool-chat-current-date-time":
      input = part.input?.timeZone ?? "UTC";
      icon = <Clock />;
      content = part.output?.ok && (
        <p>
          {part.output.local} ({part.output.timeZone})
        </p>
      );
      break;
    case "tool-chat-response-suggestions":
      input = part.input?.suggestions?.join(" · ") ?? "";
      icon = <MessageSquareQuote />;
      content = part.output?.ok && (
        <ul className="list-disc pl-5">
          {part.output.suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      );
      break;
  }
  return (
    <ChatMessagePartToolWebLayout
      agentColor={agentColor}
      part={part}
      icon={icon}
      title={t(part.type)}
      inputLabel={t("labelInput")}
      inputValue={input}
    >
      {content}
    </ChatMessagePartToolWebLayout>
  );
}
