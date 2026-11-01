import { convertToModelMessages, readUIMessageStream } from "ai";
import type { ChatMessage } from "@schornio/aibox-database/chat/_types";
import { Doc } from "yjs";
import { addChatCurrentMessage } from "../chatCurrentMessage/addChatCurrentMessage.ts";
import assert from "node:assert/strict";
import { claimNextChatCurrentMessage } from "../chatCurrentMessage/claimNextChatCurrentMessage.ts";
import { getChatInteraction } from "./getChatInteraction.ts";
import { respondToToolApproval } from "./respondToToolApproval.ts";
import { setChatCurrentMessageState } from "../chatCurrentMessage/setChatCurrentMessageState.ts";
import { test } from "vitest";

function pendingMessage(): ChatMessage {
  return {
    id: "assistant",
    metadata: { roleName: "writer" },
    parts: [
      {
        text: "I will write two files.",
        type: "text",
      },
      ...["one", "two"].map((id) => ({
        approval: {
          id: `approval-${id}`,
          requestReason: "Write access",
          signature: `signature-${id}`,
        },
        input: {
          content: id,
          path: `/${id}`,
        },
        state: "approval-requested" as const,
        toolCallId: id,
        type: "tool-storage-write-file" as const,
      })),
    ],
    role: "assistant",
  };
}

void test("approval decisions survive persistence and become signed SDK responses", async () => {
  const document = new Doc();
  document.getArray<ChatMessage>("messages").push([pendingMessage()]);
  const interaction = getChatInteraction(
    document.getArray<ChatMessage>("messages").toArray(),
  );
  assert.equal(interaction.type, "tool-approval");
  if (interaction.type !== "tool-approval")
    throw new Error("Expected approval");
  assert.equal(interaction.request.approvalId, "approval-one");
  respondToToolApproval(document, {
    approvalId: "approval-one",
    approved: true,
  });
  const nextInteraction = getChatInteraction(
    document.getArray<ChatMessage>("messages").toArray(),
  );
  assert.equal(nextInteraction.type, "tool-approval");
  if (nextInteraction.type !== "tool-approval")
    throw new Error("Expected next approval");
  assert.equal(nextInteraction.request.approvalId, "approval-two");
  respondToToolApproval(document, {
    approvalId: "approval-two",
    approved: false,
  });
  const messages = document.getArray<ChatMessage>("messages").toArray();
  assert.deepEqual(getChatInteraction(messages), { type: "message-batch" });
  const modelMessages = await convertToModelMessages(messages);
  const response = modelMessages.at(-1);
  assert.equal(response?.role, "tool");
  if (response?.role !== "tool") throw new Error("Expected tool response");
  const approvals = response.content.filter(
    (part) => part.type === "tool-approval-response",
  );
  assert.deepEqual(
    approvals.map((part) => [part.approvalId, part.approved]),
    [
      ["approval-one", true],
      ["approval-two", false],
    ],
  );
  const assistant = modelMessages.find(
    (message) => message.role === "assistant",
  );
  assert.ok(assistant && typeof assistant.content !== "string");
  const requests = assistant.content.filter(
    (part) => part.type === "tool-approval-request",
  );
  assert.deepEqual(
    requests.map((part) => part.signature),
    ["signature-one", "signature-two"],
  );
  assert.throws(
    () =>
      respondToToolApproval(document, {
        approvalId: "approval-one",
        approved: true,
      }),
    /NOT_PENDING/,
  );
});

void test("stale or out-of-order decisions cannot mutate the chat", () => {
  const document = new Doc();
  document.getArray<ChatMessage>("messages").push([pendingMessage()]);
  for (const approvalId of ["stale", "approval-two"]) {
    assert.throws(
      () => respondToToolApproval(document, { approvalId, approved: true }),
      /NOT_PENDING/,
    );
    assert.deepEqual(document.getArray("messages").toArray(), [
      pendingMessage(),
    ]);
  }
});

void test("a waiting approval blocks queued text and claims its response first", () => {
  const document = new Doc();
  const text = addChatCurrentMessage(document, {
    text: "Next message",
    type: "text",
  });
  setChatCurrentMessageState(document, text.messageId, "queued");
  assert.equal(
    claimNextChatCurrentMessage(document, { awaitingApproval: true }),
    undefined,
  );
  const approval = addChatCurrentMessage(document, {
    approvalId: "approval-one",
    approved: true,
    type: "tool-approval",
  });
  setChatCurrentMessageState(document, approval.messageId, "submitted");
  assert.equal(
    claimNextChatCurrentMessage(document, { awaitingApproval: true })?.id,
    approval.messageId,
  );
  assert.equal(claimNextChatCurrentMessage(document)?.id, text.messageId);
});

void test("resuming a tool result preserves the assistant text and other requests", async () => {
  const original = pendingMessage();
  let resumed: ChatMessage | undefined;
  for await (const message of readUIMessageStream<ChatMessage>({
    message: original,
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({
          messageId: original.id,
          type: "start",
        });
        controller.enqueue({
          output: {
            error: "Denied",
            ok: false,
          },
          toolCallId: "one",
          type: "tool-output-available",
        });
        controller.enqueue({ type: "finish" });
        controller.close();
      },
    }),
    terminateOnError: true,
  }))
    resumed = message;
  assert.equal(resumed?.id, original.id);
  assert.deepEqual(resumed?.parts[0], original.parts[0]);
  assert.equal(
    getChatInteraction(resumed ? [resumed] : []).type,
    "tool-approval",
  );
});

void test("queued drafts from existing flat realtime documents remain consumable", () => {
  const document = new Doc();
  document
    .getArray("batch")
    .push([
      { id: "legacy", state: "queued", text: "Existing draft", thinking: true },
    ]);
  assert.deepEqual(claimNextChatCurrentMessage(document), {
    content: {
      files: undefined,
      text: "Existing draft",
      thinking: true,
      type: "text",
    },
    id: "legacy",
    state: "queued",
  });
});
