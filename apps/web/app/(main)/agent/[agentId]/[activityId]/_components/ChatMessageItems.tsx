"use client";

import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import { ChatMessage } from "./ChatMessage";
import { useActivites } from "../../../../_components/ActivityContextProvider";
import { useMessages } from "./ChatContext";

export function ChatMessageItems({
  activityId,
  agentColor,
}: {
  activityId: string;
  agentColor: AppColor;
}) {
  const { activities } = useActivites();
  const activity = activities.find((activity) => activity.id === activityId);

  const messages = useMessages();

  if (!messages || messages.length === 0) {
    return undefined;
  }

  return (
    <>
      {messages.map((message) => (
        <ChatMessage
          agentColor={agentColor}
          key={message.id}
          message={message}
        />
      ))}

      {activity?.state === "error" ? (
        <div className="bg-destructive size-2 rounded-full" />
      ) : undefined}

      {activity?.state === "running" ? (
        <div className="relative size-2">
          <div className="bg-muted-foreground size-2 animate-ping rounded-full" />
          <div className="bg-muted-foreground absolute inset-0 rounded-full" />
        </div>
      ) : undefined}
    </>
  );
}
