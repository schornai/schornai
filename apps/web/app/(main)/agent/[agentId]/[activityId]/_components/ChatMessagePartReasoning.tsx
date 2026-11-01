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
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import { Brain } from "lucide-react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import { ContainerChatMessagePart } from "./ContainerChatMessagePart";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function ChatMessagePartReasoningIcon() {
  return <Brain />;
}

export function ChatMessagePartReasoning({
  agentColor,
  part,
}: {
  agentColor?: AppColor;
  part: Extract<ChatMessage["parts"][number], { type: "reasoning" }>;
}) {
  return (
    <Collapsible>
      <Marker render={<CollapsibleTrigger />}>
        <MarkerIcon>
          <ChatMessagePartReasoningIcon />
        </MarkerIcon>
        <MarkerContent className={cn({ shimmer: part.state === "streaming" })}>
          {part.state === "streaming" ? "Nachdenken..." : undefined}
          {part.state === "done" ? "Nachgedacht" : undefined}
        </MarkerContent>
      </Marker>

      <CollapsibleContent>
        <ContainerChatMessagePart agentColor={agentColor}>
          <MarkdownProse className="prose-sm max-w-full p-6">
            {part.text}
          </MarkdownProse>
          <CollapsibleTrigger
            render={
              <Button
                className="text-muted-foreground w-full aria-expanded:bg-transparent"
                size="xs"
                variant="ghost"
              >
                Schließen
              </Button>
            }
          />
        </ContainerChatMessagePart>
      </CollapsibleContent>
    </Collapsible>
  );
}
