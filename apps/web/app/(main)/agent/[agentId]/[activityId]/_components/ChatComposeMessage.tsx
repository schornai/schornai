"use client";

import {
  Collapsible,
  CollapsibleContent,
} from "@schornio/aibox-package-ui/components/collapsible";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import { ChatComposeMessageBatch } from "./ChatComposeMessageBatch";
import { ChatComposeMessageSelected } from "./ChatComposeMessageSelected";
import { ChatToolApproval } from "./ChatToolApproval";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ExhaustiveError } from "@schornio/aibox-package-utils/ExhaustiveError";
import { useChatComposeMessage } from "./ChatComposeMessageContext";
import { useState } from "react";

export function ChatComposeMessage({ agentColor }: { agentColor?: AppColor }) {
  const { interaction } = useChatComposeMessage();

  return (
    <ContainerMain className="z-10 pt-0 shadow-[0_-3px_8px_0_var(--background),0_-10px_20px_1px_var(--background)]">
      <ChatInteractionContent
        agentColor={agentColor}
        interaction={interaction}
      />
    </ContainerMain>
  );
}

function ChatInteractionContent({
  agentColor,
  interaction,
}: {
  agentColor?: AppColor;
  interaction: ReturnType<typeof useChatComposeMessage>["interaction"];
}) {
  switch (interaction.type) {
    case "message-batch":
      return <ChatMessageBatchInput />;
    case "tool-approval":
      return (
        <ChatToolApproval
          agentColor={agentColor}
          key={interaction.request.approvalId}
          request={interaction.request}
        />
      );
    default:
      throw new ExhaustiveError(interaction);
  }
}

function ChatMessageBatchInput() {
  const [batchViewOpen, setBatchViewOpen] = useState(false);

  return (
    <Collapsible open={batchViewOpen} onOpenChange={setBatchViewOpen}>
      <div className="bg-muted rounded-lg border">
        <CollapsibleContent>
          <ChatComposeMessageBatch />
        </CollapsibleContent>
        <ChatComposeMessageSelected />
      </div>
    </Collapsible>
  );
}
