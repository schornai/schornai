import type { Agent } from "@schornio/aibox-database/agent/_types";
import type { ChatMessage } from "@schornio/aibox-database/chat/_types";
import { MockLanguageModelV4 } from "ai/test";
import type { ModelMessage } from "ai";
import assert from "node:assert/strict";
import { selectRole } from "./selectRole.ts";
import { test } from "vitest";

const reader: Agent["roles"][number] = {
  documentRepositoryMounts: [],
  id: "reader",
  name: "Reader",
  prompt: "Read documents",
};
const writer: Agent["roles"][number] = {
  documentRepositoryMounts: [],
  id: "writer",
  name: "Writer",
  prompt: "Write documents",
};
const agent: Agent = {
  additionalFunctions: {
    batch: true,
    disappearingChats: true,
    fileUpload: true,
    nightshift: true,
    pursueGoal: true,
  },
  color: { oklchHue: 0, type: "color-oklch-hue" },
  description: "",
  documentation: "",
  icon: { iconName: "Bot", type: "icon-lucide" },
  id: "agent",
  modelIdentifier: "test",
  modelThinking: "optional-off",
  name: "Agent",
  recommendedMessages: [],
  roles: [reader, writer],
  version: "agent-config-version-4",
  workspaceId: "workspace",
};
const approvalMessages: ModelMessage[] = [
  {
    content: [
      {
        approvalId: "approval",
        approved: true,
        type: "tool-approval-response",
      },
    ],
    role: "tool",
  },
];
function sourceMessage(metadata?: ChatMessage["metadata"]): ChatMessage {
  return {
    id: "source",
    metadata,
    parts: [
      {
        approval: { approved: true, id: "approval" },
        input: { content: "Document", path: "/document.md" },
        state: "approval-responded",
        toolCallId: "write",
        type: "tool-storage-write-file",
      },
    ],
    role: "assistant",
  };
}

void test("approval resumes the originating role by ID, even after a rename and another message", async () => {
  const model = new MockLanguageModelV4();
  const chatMessages = [
    sourceMessage({ roleId: writer.id, roleName: "Old writer name" }),
    {
      id: "other",
      metadata: { roleId: reader.id },
      parts: [],
      role: "assistant" as const,
    },
  ];
  assert.equal(
    await selectRole(agent, approvalMessages, { model }, { chatMessages }),
    writer,
  );
  assert.equal(model.doGenerateCalls.length, 0);
});

void test("legacy role names and selected role parts remain supported", async () => {
  const legacyMarker = sourceMessage();
  legacyMarker.parts.unshift({
    data: { roleName: writer.name!, state: "selected" },
    type: "data-role",
  });
  for (const message of [
    sourceMessage({ roleName: writer.name }),
    legacyMarker,
  ]) {
    const model = new MockLanguageModelV4();
    assert.equal(
      await selectRole(
        agent,
        approvalMessages,
        { model },
        { chatMessages: [message] },
      ),
      writer,
    );
    assert.equal(model.doGenerateCalls.length, 0);
  }
});

void test("missing or removed approval roles never trigger new model routing", async () => {
  for (const chatMessages of [
    [],
    [sourceMessage()],
    [sourceMessage({ roleId: "removed", roleName: "Removed" })],
  ]) {
    const model = new MockLanguageModelV4();
    await assert.rejects(
      selectRole(agent, approvalMessages, { model }, { chatMessages }),
      /TOOL_APPROVAL_ROLE_NOT_FOUND/,
    );
    assert.equal(model.doGenerateCalls.length, 0);
  }
  const model = new MockLanguageModelV4();
  await assert.rejects(
    selectRole(
      { ...agent, roles: [reader] },
      approvalMessages,
      { model },
      {
        chatMessages: [
          sourceMessage({ roleId: writer.id, roleName: writer.name }),
        ],
      },
    ),
    /TOOL_APPROVAL_ROLE_NOT_FOUND/,
  );
});

void test("ambiguous legacy names cannot choose the wrong role", async () => {
  const model = new MockLanguageModelV4();
  await assert.rejects(
    selectRole(
      { ...agent, roles: [reader, { ...writer, name: reader.name }] },
      approvalMessages,
      { model },
      { chatMessages: [sourceMessage({ roleName: reader.name })] },
    ),
    /TOOL_APPROVAL_ROLE_NOT_FOUND/,
  );
  assert.equal(model.doGenerateCalls.length, 0);
});

void test("a legacy chat with one role needs no saved selection", async () => {
  const model = new MockLanguageModelV4();
  assert.equal(
    await selectRole(
      { ...agent, roles: [writer] },
      approvalMessages,
      { model },
      { chatMessages: [sourceMessage()] },
    ),
    writer,
  );
  assert.equal(model.doGenerateCalls.length, 0);
});

void test("normal messages still use model routing when multiple roles exist", async () => {
  const model = new MockLanguageModelV4({
    doGenerate: {
      content: [{ text: '{"roleName":"Writer"}', type: "text" }],
      finishReason: { raw: undefined, unified: "stop" },
      usage: {
        inputTokens: {
          cacheRead: undefined,
          cacheWrite: undefined,
          noCache: 1,
          total: 1,
        },
        outputTokens: { reasoning: undefined, text: 1, total: 1 },
      },
      warnings: [],
    },
  });
  assert.equal(
    await selectRole(
      agent,
      [{ content: "Write a document", role: "user" }],
      { model },
      {},
    ),
    writer,
  );
  assert.equal(model.doGenerateCalls.length, 1);
});
