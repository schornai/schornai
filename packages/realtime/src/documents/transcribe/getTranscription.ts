import type { Transcription } from "./_types.ts";
import { TypedYMap } from "../../_lib/TypedYMap.ts";
import type { Doc as YDoc } from "yjs";

/** @deprecated */
export function getTranscription(document: YDoc) {
  return new TypedYMap<Transcription>(document.getMap("transcription"));
}
