import type { Transcription } from "./_types.ts";
import type { Doc as YDoc } from "yjs";
import { getTranscription } from "./getTranscription.ts";

/** @deprecated */
export function setTranscriptionFilePath(document: YDoc, filePath?: string) {
  const transcription = getTranscription(document);

  document?.transact(() => {
    transcription.set("filePath", filePath);
  });
}

/** @deprecated */
export function setTranscriptionOutput(document: YDoc, output?: string) {
  const transcription = getTranscription(document);

  document?.transact(() => {
    transcription.set("output", output);
  });
}

/** @deprecated */
export function setTranscriptionResult(
  document: YDoc,
  result?: Transcription["result"],
) {
  const transcription = getTranscription(document);

  document?.transact(() => {
    transcription.set("result", result);
  });
}

/** @deprecated */
export function setTranscriptionStatus(
  document: YDoc,
  status: Transcription["status"],
) {
  const transcription = getTranscription(document);

  document?.transact(() => {
    transcription.set("status", status);
  });
}

/** @deprecated */
export function setTranscriptionSummary(document: YDoc, summary?: string) {
  const transcription = getTranscription(document);

  document?.transact(() => {
    transcription.set("summary", summary);
  });
}
