import type { Doc } from "yjs";
import { getChat } from "./getChat.ts";
import { getChatInteraction } from "./getChatInteraction.ts";
import { isToolUIPart } from "ai";
import { updateChatMessage } from "./updateChatMessage.ts";

export function respondToToolApproval(
  document: Doc,
  { approvalId, approved }: { approvalId: string; approved: boolean },
) {
  const messages = getChat(document).messages?.toArray() ?? [];
  const interaction = getChatInteraction(messages);
  if (
    interaction.type !== "tool-approval" ||
    interaction.request.approvalId !== approvalId
  ) {
    throw new Error("TOOL_APPROVAL_NOT_PENDING");
  }
  document.transact(() => {
    for (const message of messages) {
      let changed = false;
      const parts = message.parts.map((part) => {
        if (
          isToolUIPart(part) &&
          part.state === "approval-requested" &&
          part.approval.id === approvalId
        ) {
          changed = true;
          return {
            ...part,
            approval: { ...part.approval, approved },
            state: "approval-responded" as const,
          };
        }
        return part;
      });
      if (changed) updateChatMessage(document, { ...message, parts });
    }
  });
}
