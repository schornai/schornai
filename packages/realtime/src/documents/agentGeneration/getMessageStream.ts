import type { TextStreamPart, ToolSet } from "ai";
import { TypedYMap } from "../../_lib/TypedYMap.ts";
import type { Doc as YDoc } from "yjs";

export function getMessageStream(document: YDoc) {
  const parts = document.getArray<TextStreamPart<ToolSet>>("parts");
  const properties = new TypedYMap<{
    completeCount?: number;
    error?: unknown;
    done?: boolean;
  }>(document.getMap("properties"));
  return { parts, properties };
}
