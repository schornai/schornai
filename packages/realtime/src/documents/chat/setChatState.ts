import type { ChatState } from "./_types.ts";
// import { TypedYMap } from "../../_lib/TypedYMap.ts";
import type { Doc as YDoc } from "yjs";

export function setChatState(document: YDoc, newState: ChatState) {
  document?.transact(() => {
    const map = document.getMap("state");
    if (newState.generationId !== undefined)
      map.set("generationId", newState.generationId);
    map.set("type", newState.type);
    map.set("error", newState.type === "error" ? newState.error : undefined);
    if (newState.type === "generating") {
      map.set("claimedAtISO", newState.claimedAtISO);
      map.set("claimedWorkerId", newState.claimedWorkerId);
    } else {
      map.set("claimedAtISO", undefined);
      map.set("claimedWorkerId", undefined);
    }
  });
}
