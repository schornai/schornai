import { expect, it } from "vitest";
import { transcriptionToText } from "../packages/database/src/storage/transcriptionToText";

it("extracts readable transcript text and respects word and segment corrections", () => {
  const word = (text: string, wordOverride?: string) => ({
    word: text,
    wordOverride,
    probability: 1,
    timeStart: 0,
    timeEnd: 1,
  });
  const segment = (
    words: ReturnType<typeof word>[],
    segmentOverride?: string,
  ) => ({
    words,
    segmentOverride,
    noSpeechProbability: 0,
    timeStart: 0,
    timeEnd: 1,
  });
  expect(
    transcriptionToText({
      segments: [
        segment([word(" Hello"), word(" wrong", " world"), word("!")]),
        segment([word("incorrect")], "Corrected sentence."),
        segment([word("removed")], ""),
      ],
    }),
  ).toBe("Hello world!\nCorrected sentence.");
  expect(transcriptionToText({ segments: [] })).toBe("");
});
