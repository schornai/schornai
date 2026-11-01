export type TranscriptionResult = {
  transcription: string;

  segments: {
    text: string;

    start: number;
    end: number;

    no_speech_prob: number;

    words: {
      word: string;

      start: number;
      end: number;

      probability: number;
    }[];
  }[];
};
