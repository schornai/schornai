"use client";

import { Plug } from "lucide-react";
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
import { Button } from "@schornio/aibox-package-ui/components/button";
import { Code } from "@schornio/aibox-package-ui/components/code";
import { ContainerChatMessagePart } from "./ContainerChatMessagePart";

export function ChatMessagePartToolMCP({
  agentColor,
  part,
}: {
  agentColor?: AppColor;
  part: Extract<ChatMessage["parts"][number], { type: "tool-mcp" }>;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatMessagePartToolMCP",
  });
  const failed =
    part.state === "output-error" ||
    (part.output &&
      typeof part.output === "object" &&
      "isError" in part.output &&
      part.output.isError === true);
  const status = failed
    ? "errorRequest"
    : part.state === "output-denied" ||
        (part.state === "approval-responded" && !part.approval.approved)
      ? "labelDenied"
      : part.state === "output-available"
        ? "labelDone"
        : part.state === "approval-requested"
          ? "labelApproval"
          : "labelPending";
  return (
    <Collapsible>
      <Marker render={<CollapsibleTrigger />}>
        <MarkerIcon>
          <Plug />
        </MarkerIcon>
        <MarkerContent>
          {t("labelMCP")}: {part.input?.toolName || t("labelDiscover")} ·{" "}
          {t(status)}
        </MarkerContent>
      </Marker>
      <CollapsibleContent>
        <ContainerChatMessagePart agentColor={agentColor}>
          <div className="flex min-w-0 flex-col gap-3 p-3 wrap-anywhere">
            <p role="status">{t(status)}</p>
            {part.input?.arguments && (
              <section className="min-w-0 [&_pre]:max-h-80 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:p-3">
                <h4>{t("labelArguments")}</h4>
                <Code lang="json">
                  {JSON.stringify(part.input.arguments, null, 2)}
                </Code>
              </section>
            )}
            {part.output !== undefined && (
              <section className="min-w-0 [&_pre]:max-h-80 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:p-3">
                <h4>{t("labelResult")}</h4>
                <Code lang="json">{JSON.stringify(part.output, null, 2)}</Code>
              </section>
            )}
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
