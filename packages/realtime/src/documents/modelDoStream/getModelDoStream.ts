import type { LanguageModelV4StreamPart } from "./_types.ts";
import { TypedYMap } from "../../_lib/TypedYMap.ts";
import type { Doc as YDoc } from "yjs";

export function getModelDoStream(document: YDoc) {
  const parts = document.getArray<LanguageModelV4StreamPart>("parts");
  const properties = new TypedYMap<{
    completeCount?: number;
    error?: unknown;
    done?: boolean;
  }>(document.getMap("properties"));
  return { parts, properties };
}
