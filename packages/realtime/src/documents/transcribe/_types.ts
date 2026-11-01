export type Transcription = {
  filePath?: string;
  id: string;
  output?: string;
  result?: {
    noSpeechProbability: number;
    reviewed?: boolean;
    segmentOverride?: string;
    timeEnd: number;
    timeStart: number;
    words: {
      probability: number;
      timeEnd: number;
      timeStart: number;
      word: string;
    }[];
  }[];
  status: "queued" | "transcribing" | "success" | "error";
  summary?: string;
  transcriberId: string;
};
