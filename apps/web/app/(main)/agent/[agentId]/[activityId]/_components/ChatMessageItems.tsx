"use client";

import type {
  AppColor,
  AppIcon,
} from "@schornio/aibox-package-database/_shared/_types";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@schornio/aibox-package-ui/components/empty";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { useT } from "next-i18next/client";
import { ChatMessage } from "./ChatMessage";
import { useActivites } from "../../../../_components/ActivityContextProvider";
import { useMessages } from "./ChatContext";

export function ChatMessageItems({
  activityId,
  agentColor,
  agentIcon,
}: {
  activityId: string;
  agentColor: AppColor;
  agentIcon?: AppIcon;
}) {
  const { t } = useT("agent", { keyPrefix: "_components.ChatMessageItems" });
  const { activities } = useActivites();
  const activity = activities.find((activity) => activity.id === activityId);

  const messages = useMessages();

  if (!messages || messages.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia>
            <DynamicIcon
              name={(agentIcon?.iconName ?? "bot-message-square") as IconName}
              className="size-16"
            />
          </EmptyMedia>
          <EmptyTitle>{t("labelTitle")}</EmptyTitle>
          <EmptyDescription>{t("descriptionEmpty")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
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
