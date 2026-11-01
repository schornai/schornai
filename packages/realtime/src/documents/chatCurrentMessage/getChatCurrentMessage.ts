import type { ChatCurrentMessageFile } from "./_types.ts";
import type { ChatFeatures } from "@schornio/aibox-database/chat/_types";
import { TypedYMap } from "../../_lib/TypedYMap.ts";
import type { Doc as YDoc } from "yjs";

/**
 * @deprecated
 */
export function getChatCurrentMessage(document?: YDoc) {
  const message = document?.getText("message");
  const features = document
    ? new TypedYMap<ChatFeatures>(document.getMap("features"))
    : undefined;
  const files = document?.getArray<ChatCurrentMessageFile>("files");

  return {
    features,
    files,
    message,
  };
}
