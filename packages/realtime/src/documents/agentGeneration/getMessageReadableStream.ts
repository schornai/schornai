import type { TextStreamPart, ToolSet } from "ai";
import type { Doc as YDoc } from "yjs";
import { getMessageStream } from "./getMessageStream.ts";

export function getMessageReadableStream(document: YDoc) {
  const { parts, properties } = getMessageStream(document);

  let currentIndex = 0;

  return new ReadableStream<TextStreamPart<ToolSet>>({
    start(controller) {
      const handler = () => {
        const partsArray = parts.toArray();

        while (currentIndex < partsArray.length) {
          const part = partsArray[currentIndex];
          controller.enqueue(part);
          currentIndex += 1;
        }

        const completeCount = properties.get("completeCount");
        const done = properties.get("done");

        if (done && completeCount === currentIndex) {
          controller.close();
          parts.unobserve(handler);
          properties.unobserve(handler);
        }

        const error = properties.get("error");
        if (error) {
          controller.error(error);
        }
      };

      parts.observe(handler);
      properties.observe(handler);
    },
  });
}
