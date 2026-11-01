import type { LanguageModelV4StreamPart } from "./_types.ts";
import type { Doc as YDoc } from "yjs";
import { getModelDoStream } from "./getModelDoStream.ts";

export function getModelDoGenerateReadableStream(
  document: YDoc,
  options?: {
    onStreamDone?: () => void;
    onStreamError?: (error: unknown) => void;
    onStreamCancel?: () => void;
  },
) {
  const { parts, properties } = getModelDoStream(document);

  let currentIndex = 0;
  let cleanup = () => {};

  return new ReadableStream<LanguageModelV4StreamPart>({
    start(controller) {
      let settled = false;
      const handler = () => {
        if (settled) return;
        const partsArray = parts.toArray();

        for (const part of partsArray.slice(currentIndex)) {
          controller.enqueue(part);
          currentIndex += 1;
        }

        const completeCount = properties.get("completeCount");
        const done = properties.get("done");

        const error = properties.get("error");
        if (error) {
          settled = true;
          controller.error(error);
          cleanup();
          options?.onStreamError?.(error);
          return;
        }

        if (done && completeCount === currentIndex) {
          settled = true;
          controller.close();
          cleanup();
          options?.onStreamDone?.();
        }
      };

      cleanup = () => {
        settled = true;
        parts.unobserve(handler);
        properties.unobserve(handler);
      };
      parts.observe(handler);
      properties.observe(handler);
      handler();
    },
    cancel() {
      cleanup();
      options?.onStreamCancel?.();
    },
  });
}
