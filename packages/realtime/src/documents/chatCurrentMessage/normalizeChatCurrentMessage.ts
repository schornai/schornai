import type { Message, TextMessage } from "./_types.ts";

// Existing realtime documents may still contain the former flat text drafts.
type LegacyMessage = Omit<TextMessage, "content"> &
  Omit<TextMessage["content"], "type">;
type LegacyApprovalMessage = Omit<Message, "content"> & {
  content: {
    type: "tool-approval";
    approvals: { approvalId: string; approved: boolean }[];
    thinking?: boolean;
  };
};

export function normalizeChatCurrentMessage(
  message: Message | LegacyMessage | LegacyApprovalMessage,
): Message {
  if (!("content" in message)) {
    return {
      content: {
        files: message.files,
        text: message.text,
        thinking: message.thinking,
        type: "text",
      },
      id: message.id,
      state: message.state,
    };
  }
  if (
    message.content.type === "tool-approval" &&
    "approvals" in message.content
  ) {
    const approval = message.content.approvals[0];
    if (!approval) throw new Error("TOOL_APPROVAL_RESPONSE_MISSING");
    return {
      content: {
        ...approval,
        thinking: message.content.thinking,
        type: "tool-approval",
      },
      id: message.id,
      state: message.state,
    };
  }
  return message as Message;
}
