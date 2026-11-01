import type { StorageTranscription } from "./_types.ts";

export function transcriptionToText(
  transcription: StorageTranscription,
): string {
  if (transcription.textOverride !== undefined)
    return transcription.textOverride;
  return transcription.segments
    .map(
      (segment) =>
        segment.segmentOverride ??
        segment.words.map((word) => word.wordOverride ?? word.word).join(""),
    )
    .map((text) => text.trim())
    .filter(Boolean)
    .join("\n");
}
