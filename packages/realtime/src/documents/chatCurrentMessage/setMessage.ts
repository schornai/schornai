import type { Doc as YDoc } from "yjs";

export function setMessage(document: YDoc, newMessage: string) {
  const message = document?.getText("message");

  document.transact(() => {
    message?.delete(0, message.length);
    message?.insert(0, newMessage);
  });
}
