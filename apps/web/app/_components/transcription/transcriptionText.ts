import type { StorageTranscription } from "@schornio/aibox-package-database/storage/_types";

export type TranscriptionSegmentData = StorageTranscription["segments"][number];

export function segmentText(segment: TranscriptionSegmentData): string {
  return (
    segment.segmentOverride ??
    segment.words
      .map((word) => word.wordOverride ?? word.word)
      .join("")
      .trim()
  );
}

function timestamp(seconds: number): string {
  const milliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor(milliseconds / 60000) % 60;
  const rest = Math.floor(milliseconds / 1000) % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")},${String(milliseconds % 1000).padStart(3, "0")}`;
}

export function transcriptionToSrt(
  segments: TranscriptionSegmentData[],
): string {
  return segments
    .filter(
      (segment) =>
        Number.isFinite(segment.timeStart) &&
        Number.isFinite(segment.timeEnd) &&
        segment.timeStart >= 0 &&
        Math.round(segment.timeEnd * 1000) >
          Math.round(segment.timeStart * 1000) &&
        segmentText(segment).trim(),
    )
    .map((segment, index) => {
      // Empty lines delimit SRT cues, so preserve text lines without creating new cues.
      const text = segmentText(segment)
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
      return `${index + 1}\n${timestamp(segment.timeStart)} --> ${timestamp(segment.timeEnd)}\n${text}\n`;
    })
    .join("\n");
}
