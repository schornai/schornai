import { createUIMessageStream, readUIMessageStream } from "ai";
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import { withContextCompression } from "@schornio/aibox-realtime/models/withContextCompression";
import type { LanguageModelV4 } from "@schornio/aibox-realtime/documents/modelDoStream/_types";

export const contextCompressionQuestion: ChatMessage = {
  id: "question",
  role: "user",
  parts: [
    {
      type: "text",
      text: "Bitte fahre mit unserem Plan fort. Behalte die bisherigen Entscheidungen bei.",
    },
  ],
};

/** Real budget/compression and UI stream; a deterministic local provider replaces network calls. */
export async function runContextCompressionDemo(
  publish: (message: ChatMessage) => void,
) {
  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: "answer" });
      let firstChunk = true;
      const provider = {
        specificationVersion: "v4",
        provider: "storybook",
        modelId: "small-context",
        supportedUrls: {},
        doGenerate: async () => {
          if (firstChunk) {
            firstChunk = false;
            await new Promise((resolve) => setTimeout(resolve, 1800));
          }
          return {
            content: [
              {
                type: "text",
                text: "Preserve the agreed plan and prior decisions.",
              },
            ],
          };
        },
        doStream: async () => ({
          stream: new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
        }),
      } as unknown as LanguageModelV4;
      const model = withContextCompression(
        provider,
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
            content: [
              {
                type: "text",
                text: "Previous decisions and planning details. ".repeat(300),
              },
            ],
          },
          {
            role: "assistant",
            content: [{ type: "text", text: "Plan recorded." }],
          },
          {
            role: "user",
            content: [{ type: "text", text: "Continue with the plan." }],
          },
        ],
      });
      writer.write({ type: "text-start", id: "reply" });
      writer.write({
        type: "text-delta",
        id: "reply",
        delta:
          "Ich fahre mit dem vereinbarten Plan fort. Die bisherigen Entscheidungen sind in der Zusammenfassung erhalten.",
      });
      writer.write({ type: "text-end", id: "reply" });
      writer.write({ type: "finish" });
    },
  });
  for await (const message of readUIMessageStream<ChatMessage>({
    stream,
    terminateOnError: true,
  }))
    publish(message);
}
