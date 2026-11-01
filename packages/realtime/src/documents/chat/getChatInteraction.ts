import { getToolName, isToolUIPart } from "ai";
import type { ChatMessage } from "@schornio/aibox-database/chat/_types";

export type ToolApprovalRequest = {
  approvalId: string;
  toolName: string;
  input: unknown;
};

// Add future interaction kinds here and handle them in the composer dispatcher.
export type ChatInteraction =
  | { type: "message-batch" }
  | { type: "tool-approval"; request: ToolApprovalRequest };

export function getChatInteraction(messages: ChatMessage[]): ChatInteraction {
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts) {
      if (isToolUIPart(part) && part.state === "approval-requested") {
        return {
          request: {
            approvalId: part.approval.id,
            input: part.input,
            toolName: getToolName(part),
          },
          type: "tool-approval",
        };
      }
    }
  }
  return { type: "message-batch" };
}
