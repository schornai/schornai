import type { StorageTranscription } from "@schornio/aibox-database/storage/_types";
import type { TranscriptionResult } from "./TranscriptionResult.ts";

export function mapTranscription(
  result: TranscriptionResult,
): StorageTranscription {
  const segments = result.segments.map((segment) => ({
    noSpeechProbability: segment.no_speech_prob,
    reviewed: false,
    timeEnd: segment.end,
    timeStart: segment.start,
    words: segment.words.map((word) => ({
      probability: word.probability,
      timeEnd: word.end,
      timeStart: word.start,
      word: word.word,
    })),
  }));
  return {
    segments,
  };
}
