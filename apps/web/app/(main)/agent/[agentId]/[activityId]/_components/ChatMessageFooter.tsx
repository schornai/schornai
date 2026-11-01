"use client";

import { CircleGauge, Copy } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import type { ChatMessage as ChatMessageType } from "@schornio/aibox-package-database/chat/_types";
import { MessageFooter } from "@schornio/aibox-package-ui/components/message";
import { useDecayState } from "@schornio/aibox-package-ui/hooks/use-decay-state";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function ChatMessageFooter({ message }: { message: ChatMessageType }) {
  const { i18n } = useT();
  const [copyIsPending, setCopyIsPending] = useState(false);
  const [copyFinishState, setCopyFinishState] = useDecayState<
    "success" | "error" | undefined
  >(undefined);

  const numberFormatter = new Intl.NumberFormat(i18n.language);

  const hasText = message.parts.some((part) => part.type === "text");

  if (!hasText && !message.metadata?.usage) {
    return undefined;
  }

  return (
    <MessageFooter>
      {hasText ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <ButtonAction
                hasErrored={copyFinishState === "error"}
                hasSucceeded={copyFinishState === "success"}
                isPending={copyIsPending}
                onClick={() => {
                  setCopyIsPending(true);

                  const messageText = message.parts
                    .filter((part) => part.type === "text")
                    .map((part) => part.text)
                    .join("\n\n");

                  navigator.clipboard
                    .writeText(messageText)
                    .then(() => setCopyFinishState("success"))
                    .catch(() => setCopyFinishState("error"))
                    .finally(() => setCopyIsPending(false));
                }}
                indicator="replace"
                size="icon-xs"
                variant="ghost"
              >
                <Copy />
              </ButtonAction>
            }
          />
          <TooltipContent>Nachricht kopieren</TooltipContent>
        </Tooltip>
      ) : undefined}

      {message.metadata?.usage ? (
        <Collapsible className="flex items-center gap-1">
          <Tooltip>
            <CollapsibleTrigger
              render={
                <TooltipTrigger
                  render={
                    <Button size="icon-xs" variant="ghost">
                      <CircleGauge />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>Statistik</TooltipContent>
          </Tooltip>
          <CollapsibleContent>
            {numberFormatter.format(message.metadata.usage.inputTokens ?? 0)}{" "}
            Eingabe-Tokens ·{" "}
            {numberFormatter.format(message.metadata.usage.outputTokens ?? 0)}{" "}
            Ausgabe-Tokens ·{" "}
            {numberFormatter.format(
              Math.round(
                (message.metadata.usage.outputTokens ?? 0) /
                  ((message.metadata.timing?.outputDuration ?? 0) / 1000),
              ),
            )}{" "}
            Token pro Sekunde
          </CollapsibleContent>
        </Collapsible>
      ) : undefined}
    </MessageFooter>
  );
}
