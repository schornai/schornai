import type { TextStreamPart, ToolSet } from "ai";
import type { Doc as YDoc } from "yjs";
import { getMessageStream } from "./getMessageStream.ts";

export function pushMessageStreamPart(
  document: YDoc,
  part: TextStreamPart<ToolSet>,
) {
  const { parts: messageStream } = getMessageStream(document);

  document?.transact(() => {
    messageStream.push([part]);
  });
}
