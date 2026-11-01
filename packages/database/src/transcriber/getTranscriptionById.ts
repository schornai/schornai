import { cache } from "react";
import { notFound } from "next/navigation";
import { tryGetTranscriptionById } from "./tryGetTranscriptionById";

export const getTranscriptionById = cache(async (transcriptionId: string) => {
  const transcription = await tryGetTranscriptionById(transcriptionId);

  if (!transcription) {
    notFound();
  }

  return transcription;
});
