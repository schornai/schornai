"use client";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import { useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { DraftingCompass } from "lucide-react";
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
import { ContainerChatMessagePart } from "./ContainerChatMessagePart";
import { PlatformToolPreview } from "./PlatformToolPreview";

type PlatformPart = Extract<
  ChatMessage["parts"][number],
  { type: `tool-platform_${string}` }
>;
export function isPlatformToolPart(
  part: ChatMessage["parts"][number],
): part is PlatformPart {
  return part.type.startsWith("tool-platform_");
}
export function ChatMessagePartToolPlatform({
  part,
  agentColor,
}: {
  part: PlatformPart;
  agentColor?: AppColor;
}) {
  const { t } = useT("agent", { keyPrefix: "_components.PlatformToolPreview" });
  const name = part.type.slice(5);
  const businessFailure =
    part.output &&
    typeof part.output === "object" &&
    "status" in part.output &&
    ["conflict", "recoveryRequired"].includes(String(part.output.status));
  const status =
    part.state === "output-error" || businessFailure
      ? "labelError"
      : part.state === "output-denied" ||
          (part.state === "approval-responded" && !part.approval.approved)
        ? "labelDenied"
        : part.state === "output-available"
          ? "labelDone"
          : part.state === "approval-requested"
            ? "labelApproval"
            : "labelPending";
  // Creation results contain only IDs. Combine with the submitted snapshot for a useful confirmation.
  let result: unknown = part.output;
  let resultIncludesInput =
    part.state === "output-available" &&
    (name === "platform_file_write" ||
      name === "platform_activity_file_write" ||
      name === "platform_file_read");
  if (
    part.state === "output-available" &&
    part.input &&
    typeof part.input === "object" &&
    result &&
    typeof result === "object"
  ) {
    const input = part.input as Record<string, unknown>;
    const output = result as Record<string, unknown>;
    const entity = input.agent ?? input.repository;
    const id = output.agentId ?? output.documentRepositoryId ?? output.id;
    if (entity && typeof entity === "object" && typeof id === "string") {
      result = { ...entity, id };
      resultIncludesInput = true;
    }
  }
  return (
    <Collapsible>
      <Marker render={<CollapsibleTrigger />}>
        <MarkerIcon>
          <DraftingCompass />
        </MarkerIcon>
        <MarkerContent>
          {t(`tools.${name}`, { defaultValue: name })} · {t(status)}
        </MarkerContent>
      </Marker>
      <CollapsibleContent>
        <ContainerChatMessagePart agentColor={agentColor}>
          <div className="flex min-w-0 flex-col gap-4 p-3">
            <p role="status">{t(status)}</p>
            {part.input !== undefined && !resultIncludesInput && (
              <section>
                <h4 className="mb-2 font-medium">{t("labelRequest")}</h4>
                <PlatformToolPreview toolName={name} value={part.input} />
              </section>
            )}
            {part.state === "output-error" && (
              <p role="alert">{t("descriptionError")}</p>
            )}
            {part.output !== undefined && (
              <section>
                <h4 className="mb-2 font-medium">{t("labelResult")}</h4>
                <PlatformToolPreview
                  toolName={name}
                  value={result}
                  input={part.input}
                  result
                />
              </section>
            )}
          </div>
          <CollapsibleTrigger
            render={
              <Button
                className="text-muted-foreground w-full aria-expanded:bg-transparent"
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
