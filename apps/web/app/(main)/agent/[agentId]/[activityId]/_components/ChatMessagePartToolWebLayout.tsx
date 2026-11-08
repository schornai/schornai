"use client";

import { useT } from "next-i18next/client";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@schornio/aibox-package-ui/components/marker";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { ContainerChatMessagePart } from "./ContainerChatMessagePart";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { CodeInline } from "@schornio/aibox-package-ui/components/code-inline";
import { Separator } from "@schornio/aibox-package-ui/components/separator";
import type { ReactNode } from "react";

export function WebSourceLink({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  try {
    const parsed = new URL(url);
    if (
      ["https:", "http:"].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password
    )
      return (
        <a
          className="break-words underline"
          href={parsed.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
  } catch {
    /* Historical or malformed tool output remains plain text. */
  }
  return <span>{children}</span>;
}

export function ChatMessagePartToolWebLayout({
  agentColor,
  part,
  icon,
  title,
  inputLabel,
  inputValue,
  children,
}: {
  agentColor?: AppColor;
  part: Extract<
    ChatMessage["parts"][number],
    {
      type:
        | "tool-web-fetch"
        | "tool-web-search"
        | "tool-calculator"
        | "tool-chat-set-label"
        | "tool-chat-current-date-time"
        | "tool-chat-response-suggestions";
    }
  >;
  icon: ReactNode;
  title: string;
  inputLabel: string;
  inputValue?: string;
  children: ReactNode;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatMessagePartToolWebLayout",
  });
  const output = part.output?.ok ? part.output : undefined;
  const error =
    part.state === "output-error"
      ? part.errorText
      : part.output?.ok === false
        ? part.output.error
        : undefined;
  const state = error
    ? "errorRequest"
    : part.state === "output-denied" ||
        (part.state === "approval-responded" && !part.approval.approved)
      ? "labelDenied"
      : output
        ? "labelDone"
        : part.state === "approval-requested"
          ? "labelApproval"
          : "labelPending";

  return (
    <Collapsible>
      <Marker render={<CollapsibleTrigger />}>
        <MarkerIcon>{icon}</MarkerIcon>
        <MarkerContent>
          {title}: {inputValue} · {t(state)}
        </MarkerContent>
      </Marker>
      <CollapsibleContent>
        <ContainerChatMessagePart agentColor={agentColor}>
          <div className="p-3 wrap-anywhere">
            {inputLabel}: <CodeInline>{inputValue}</CodeInline>
          </div>
          <Separator />
          <div className="flex min-w-0 flex-col gap-3 p-3 wrap-anywhere">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!output && !error && <p role="status">{t(state)}</p>}
            {children}
          </div>
          <CollapsibleTrigger
            render={
              <Button
                className="w-full aria-expanded:bg-transparent"
                size="xs"
                variant="ghost"
              >
                {t("labelClose")}
              </Button>
            }
          />
        </ContainerChatMessagePart>
      </CollapsibleContent>
    </Collapsible>
  );
}
