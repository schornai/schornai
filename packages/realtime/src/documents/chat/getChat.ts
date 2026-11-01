import type { ChatMessage } from "@schornio/aibox-database/chat/_types";
import type { ChatState } from "./_types.ts";
import { TypedYMap } from "../../_lib/TypedYMap.ts";
import type { Doc as YDoc } from "yjs";

export function getChat(document?: YDoc) {
  const messages = document?.getArray<ChatMessage>("messages");
  const state = document
    ? new TypedYMap<ChatState>(document.getMap("state"))
    : undefined;

  return {
    messages,
    state,
  };
}
