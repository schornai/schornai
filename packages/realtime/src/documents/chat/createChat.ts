import type { Chat } from "@schornio/aibox-database/chat/_types";
import { Doc as YDoc } from "yjs";
import { getChat } from "./getChat.ts";

export function createChat(chat?: Chat) {
  const document = new YDoc();

  if (chat) {
    const { messages, state } = getChat(document);

    messages?.insert(0, [...(chat.messages ?? [])]);
    state?.setObject({ type: "idle" });
  }

  return document;
}
