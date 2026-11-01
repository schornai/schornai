import { ChatMessagePart, ChatMessagePartIcon } from "./ChatMessagePart";
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
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import { ChevronRight } from "lucide-react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function ChatMessageStep({
  agentColor,
  parts,
}: {
  agentColor?: AppColor;
  parts: ChatMessage["parts"];
}) {
  const streaming = parts.some(
    (part) =>
      "state" in part &&
      (part.state === "streaming" || part.state === "input-streaming"),
  );

  const uniquePartTypes = Array.from(new Set(parts.map((part) => part.type)));

  if (parts.length === 1) {
    return <ChatMessagePart agentColor={agentColor} part={parts[0]!} />;
  }

  return (
    <Collapsible>
      <Marker render={<CollapsibleTrigger className="group/button" />}>
        <MarkerContent className={cn({ shimmer: streaming })}>
          {/* bei der internationalisierung nicht auf singular/plural vergessen */}
          {parts.length} Schritte
        </MarkerContent>
        {uniquePartTypes.map((partType) => (
          <MarkerIcon key={partType}>
            <ChatMessagePartIcon partType={partType} />
          </MarkerIcon>
        ))}
        <MarkerIcon>
          <ChevronRight className="transition-transform duration-300 group-data-panel-open/button:rotate-90" />
        </MarkerIcon>
      </Marker>

      <CollapsibleContent>
        <div className="flex flex-col gap-3 py-3 pl-3">
          {parts.map((part, index) => (
            <ChatMessagePart
              agentColor={agentColor}
              key={`${part.type}_${index}`}
              part={part}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
