"use client";

import {
  Message,
  MessageContent,
} from "@schornio/aibox-package-ui/components/message";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import { ChatMessageFooter } from "./ChatMessageFooter";
import { ChatMessagePart } from "./ChatMessagePart";
import { ChatMessageStep } from "./ChatMessageStep";
import type { ChatMessage as ChatMessageType } from "@schornio/aibox-package-database/chat/_types";
import { ChatMessageUser } from "./ChatMessageUser";
import { Fragment } from "react";
import { MessageScrollerItem } from "@schornio/aibox-package-ui/components/message-scroller";

type ChatMessagePart = ChatMessageType["parts"][number];

function groupMessageParts(parts: ChatMessagePart[]) {
  const visibleParts = parts.filter((part) => part.type !== "step-start");

  const partGroups: (
    | ["standalone", Extract<ChatMessagePart, { type: "text" }>]
    | ["grouped", ChatMessagePart[]]
  )[] = [];

  let currentGroup: ["grouped", ChatMessagePart[]] | undefined = undefined;

  for (const part of visibleParts) {
    if (part.type === "text") {
      if (currentGroup) {
        partGroups.push(currentGroup);
        currentGroup = undefined;
      }

      partGroups.push(["standalone", part]);
    } else {
      if (!currentGroup) {
        currentGroup = ["grouped", []];
      }
      currentGroup[1].push(part);
    }
  }

  if (currentGroup) {
    partGroups.push(currentGroup);
  }

  return partGroups;
}

export function ChatMessage({
  agentColor,
  message,
}: {
  agentColor?: AppColor;
  message: ChatMessageType;
}) {
  return (
    <MessageScrollerItem scrollAnchor={message.role === "user"}>
      <Message align={message.role === "user" ? "end" : undefined}>
        <MessageContent>
          {message.role === "user" ? (
            <ChatMessageUser message={message} />
          ) : undefined}

          {message.role === "assistant"
            ? groupMessageParts(message.parts).map(
                ([groupType, content], index) => (
                  <Fragment key={`${message.id}_${groupType}_${index}`}>
                    {groupType === "standalone" ? (
                      <ChatMessagePart agentColor={agentColor} part={content} />
                    ) : undefined}
                    {groupType === "grouped" ? (
                      <ChatMessageStep
                        agentColor={agentColor}
                        parts={content}
                      />
                    ) : undefined}
                  </Fragment>
                ),
              )
            : undefined}

          <ChatMessageFooter message={message} />
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
}
