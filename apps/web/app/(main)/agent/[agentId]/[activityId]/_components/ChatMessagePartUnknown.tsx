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
import { Button } from "@schornio/aibox-package-ui/components/button";
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import { CircleQuestionMark } from "lucide-react";
import { Code } from "@schornio/aibox-package-ui/components/code";
import { ContainerChatMessagePart } from "./ContainerChatMessagePart";

export function ChatMessagePartUnknownIcon() {
  return <CircleQuestionMark />;
}

export function ChatMessagePartUnknown({
  agentColor,
  part,
}: {
  agentColor?: AppColor;
  part: ChatMessage["parts"][number];
}) {
  return (
    <Collapsible>
      <Marker render={<CollapsibleTrigger />}>
        <MarkerIcon>
          <ChatMessagePartUnknownIcon />
        </MarkerIcon>
        <MarkerContent>Unbekannte Ausgabe</MarkerContent>
      </Marker>

      <CollapsibleContent>
        <ContainerChatMessagePart agentColor={agentColor}>
          <div className="p-3">
            <div className="p-3">
              Das Modell hat eine unbekannte Ausgabe erzeugt, welche vom System
              nicht weiter verarbeitet werden kann.
            </div>
            <div className="[&_>_pre]:rounded-md [&_>_pre]:p-3">
              <Code lang="json">{JSON.stringify(part, null, 2)}</Code>
            </div>
          </div>
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
