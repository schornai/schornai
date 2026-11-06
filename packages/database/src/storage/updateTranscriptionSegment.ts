import type { StorageRealtimeSession, StorageTranscription } from "./_types.ts";
import { inspect } from "./inspect.ts";
import { getDocumentContent } from "./getDocumentContent.ts";
import { createDocumentTranscription } from "./createDocumentTranscription.ts";

// Caller must authorize write access and hold the file lock, as for updateFileText.
export async function updateTranscriptionSegment(
  input: {
    path: string;
    segmentIndex: number;
    expectedSegment: NonNullable<StorageTranscription["segments"]>[number];
    text: string | null;
    reviewed: boolean;
  },
  { session }: { session: StorageRealtimeSession },
) {
  const target = await inspect(input.path, session);
  if (!target?.file) throw new Error("Transcription file unavailable");
  const current = await getDocumentContent(target.path, session);
  if (current?.type !== "transcript" || !current.segments?.[input.segmentIndex])
    throw new Error("Transcription segment unavailable");
  const segment = current.segments[input.segmentIndex]!;
  if (JSON.stringify(segment) !== JSON.stringify(input.expectedSegment))
    return { status: "conflict" as const };
  const updated = { ...segment, reviewed: input.reviewed };
  if (input.text === null) delete updated.segmentOverride;
  else updated.segmentOverride = input.text;
  const transcription = {
    ...current,
    segments: current.segments.map((item, index) =>
      index === input.segmentIndex ? updated : item,
    ),
  };
  await createDocumentTranscription(target, transcription, session);
  return { status: "saved" as const, transcription };
}
