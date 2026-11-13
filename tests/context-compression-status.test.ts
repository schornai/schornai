import { describe, expect, it, vi } from "vitest";
import { Doc, applyUpdate, encodeStateAsUpdate } from "yjs";
import {
  convertToModelMessages,
  createUIMessageStream,
  readUIMessageStream,
} from "ai";
import type { ChatMessage } from "../packages/database/src/chat/_types";
import { validateChatMessages } from "../packages/database/src/chat/_schema";
import { updateChatMessage } from "../packages/realtime/src/documents/chat/updateChatMessage";
import { finalizeInterruptedToolInputs } from "../packages/realtime/src/documents/chat/finalizeInterruptedToolInputs";
import { withContextCompression } from "../packages/realtime/src/models/withContextCompression";
import type { LanguageModelV4 } from "../packages/realtime/src/documents/modelDoStream/_types";

describe("visible context compression", () => {
  it("publishes pending before summarization, persists completion, and preserves history across SDK updates", async () => {
    const doc = new Doc();
    const history: ChatMessage = {
      id: "user",
      role: "user",
      parts: [{ type: "text", text: "Original question" }],
    };
    updateChatMessage(doc, history);
    const published: ChatMessage[] = [];
    const base = {
      specificationVersion: "v4",
      provider: "test",
      modelId: "test",
      supportedUrls: {},
      doGenerate: vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return { content: [{ type: "text", text: "Preserved goals." }] };
      }),
      doStream: vi.fn(async () => ({ stream: new ReadableStream() })),
    } as unknown as LanguageModelV4;
    const stream = createUIMessageStream<ChatMessage>({
      execute: async ({ writer }) => {
        writer.write({ type: "start", messageId: "response" });
        const model = withContextCompression(
          base,
          async () => 4096,
          ({ id, state }) =>
            writer.write({
              type: "data-contextCompression",
              id,
              data: { state },
            }),
        );
        await model.doStream({
          prompt: [
            {
              role: "user",
              content: [{ type: "text", text: "Earlier facts ".repeat(1000) }],
            },
            {
              role: "assistant",
              content: [{ type: "text", text: "Understood" }],
            },
            { role: "user", content: [{ type: "text", text: "Continue" }] },
          ],
        });
        writer.write({ type: "text-start", id: "text" });
        writer.write({ type: "text-delta", id: "text", delta: "Answer" });
        writer.write({ type: "text-delta", id: "text", delta: " continued" });
        writer.write({ type: "text-end", id: "text" });
        writer.write({ type: "finish" });
      },
    });
    for await (const message of readUIMessageStream<ChatMessage>({ stream })) {
      published.push(structuredClone(message));
      updateChatMessage(doc, message);
    }
    expect(
      published.some((message) =>
        message.parts.some(
          (part) =>
            part.type === "data-contextCompression" &&
            part.data.state === "pending",
        ),
      ),
    ).toBe(true);
    const restored = new Doc();
    applyUpdate(restored, encodeStateAsUpdate(doc));
    const messages = await validateChatMessages(
      restored.getArray("messages").toArray(),
    );
    expect(messages[0]).toEqual(history);
    expect(messages[1]?.parts).toEqual([
      expect.objectContaining({
        type: "data-contextCompression",
        data: { state: "completed" },
      }),
      expect.objectContaining({ type: "text", text: "Answer continued" }),
    ]);
    expect(
      JSON.stringify(await convertToModelMessages(messages)),
    ).not.toContain("contextCompression");
  });

  it.each([false, true])(
    "reports failed or interrupted summarization (abort=%s)",
    async (abort) => {
      const controller = new AbortController();
      const listener = vi.fn();
      const base = {
        doGenerate: async () => {
          if (abort) controller.abort();
          throw new Error("provider failed");
        },
      } as unknown as LanguageModelV4;
      const model = withContextCompression(base, async () => 4096, listener);
      await expect(
        model.doGenerate({
          abortSignal: controller.signal,
          prompt: [
            {
              role: "user",
              content: [{ type: "text", text: "old".repeat(5000) }],
            },
            { role: "user", content: [{ type: "text", text: "new" }] },
          ],
        }),
      ).rejects.toThrow("provider failed");
      expect(listener.mock.calls.map(([event]) => event.state)).toEqual([
        "pending",
        abort ? "interrupted" : "failed",
      ]);
    },
  );

  it("finalizes stale pending status without changing completed markers", () => {
    const initial: ChatMessage = {
      id: "answer",
      role: "assistant",
      parts: [
        { type: "text", text: "Earlier result" },
        {
          type: "data-contextCompression",
          id: "first",
          data: { state: "completed" },
        },
        {
          type: "data-contextCompression",
          id: "second",
          data: { state: "pending" },
        },
      ],
    };
    const finalized = finalizeInterruptedToolInputs(initial);
    expect(finalized.parts.at(-1)).toMatchObject({
      data: { state: "interrupted" },
    });
    expect(finalized.parts[1]).toMatchObject({ data: { state: "completed" } });
    expect(initial.parts.at(-1)).toMatchObject({ data: { state: "pending" } });
  });
});
