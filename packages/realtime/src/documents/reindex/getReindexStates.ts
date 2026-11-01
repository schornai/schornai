import type { ReindexState } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function getReindexStates(document: YDoc) {
  const states = document.getArray<ReindexState>("state");

  return {
    states,
  };
}
