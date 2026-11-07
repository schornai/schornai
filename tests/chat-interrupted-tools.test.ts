import { describe, expect, it } from "vitest";
import { convertToModelMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { ChatMessage } from "../packages/database/src/chat/_types";
import { finalizeInterruptedToolInputs } from "../packages/realtime/src/documents/chat/finalizeInterruptedToolInputs";

const interrupted = (): ChatMessage => ({
  id: "answer",
  role: "assistant",
  parts: [
    { type: "step-start" },
    {
      type: "reasoning",
      text: "Earlier step",
      state: "done",
      providerMetadata: { openai: { itemId: "rs_saved" } },
    },
    {
      type: "tool-platform_files_list",
      toolCallId: "list",
      state: "output-available",
      input: {},
      output: [],
    },
    { type: "step-start" },
    {
      type: "reasoning",
      text: "",
      state: "done",
      providerMetadata: {
        openai: {
          itemId: "rs_uncommitted",
          reasoningEncryptedContent: "incomplete",
        },
      },
    },
    {
      type: "tool-platform_agent_create",
      toolCallId: "create",
      state: "input-streaming",
      input: { agent: { name: "Demo" } },
      rawInput: '{"agent":{"name":"Demo"',
    },
  ],
});

describe("interrupted tool input recovery", () => {
  it("preserves completed work and records that a partial call was never executed, without mutating history", () => {
    const original = interrupted();
    const finalized = finalizeInterruptedToolInputs(original);
    expect(finalized.parts.slice(0, 3)).toEqual(original.parts.slice(0, 3));
    expect(finalized.parts.at(-1)).toMatchObject({
      state: "output-error",
      toolCallId: "create",
      errorText: expect.stringContaining("not executed"),
    });
    expect(original.parts.at(-1)).toMatchObject({ state: "input-streaming" });
    expect(finalizeInterruptedToolInputs(finalized)).toBe(finalized);
  });

  it("produces paired model calls/results without replaying the uncommitted reasoning reference", async () => {
    const messages = await convertToModelMessages([
      finalizeInterruptedToolInputs(interrupted()),
      {
        id: "continue",
        role: "user",
        parts: [{ type: "text", text: "weiter" }],
      },
    ]);
    let body: any;
    const model = createOpenAI({
      apiKey: "test",
      fetch: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        throw new Error("request captured");
      },
    }).responses("gpt-5");
    await expect(model.doGenerate({ prompt: messages as any })).rejects.toThrow(
      "request captured",
    );
    expect(body.input).toContainEqual({
      type: "item_reference",
      id: "rs_saved",
    });
    expect(JSON.stringify(body)).not.toContain("rs_uncommitted");
    expect(body.input).toContainEqual(
      expect.objectContaining({ type: "function_call", call_id: "create" }),
    );
    expect(body.input).toContainEqual(
      expect.objectContaining({
        type: "function_call_output",
        call_id: "create",
        output: expect.stringContaining("not executed"),
      }),
    );
  });

  it("leaves genuine approval requests, completed errors and successful results unchanged", () => {
    const message: ChatMessage = {
      id: "approval",
      role: "assistant",
      parts: [
        {
          type: "tool-platform_agent_create",
          toolCallId: "create",
          state: "approval-requested",
          input: {},
          approval: { id: "approval" },
        },
      ],
    };
    expect(finalizeInterruptedToolInputs(message)).toBe(message);
  });

  it("handles dynamic tools and mixed parallel results without discarding successful calls", () => {
    const message: ChatMessage = {
      id: "dynamic",
      role: "assistant",
      parts: [
        {
          type: "dynamic-tool",
          toolName: "partial",
          toolCallId: "partial",
          state: "input-streaming",
          input: {},
        },
        {
          type: "dynamic-tool",
          toolName: "done",
          toolCallId: "done",
          state: "output-available",
          input: {},
          output: "saved",
        },
      ],
    };
    expect(finalizeInterruptedToolInputs(message).parts).toEqual([
      expect.objectContaining({ state: "output-error" }),
      message.parts[1],
    ]);
  });
});
