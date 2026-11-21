import { z } from "zod";

export const maxVoiceSeconds = 5 * 60;
export const voiceWaveformBars = 48;

// Paths are always relative to the authorized conversation's storage.
export const voiceMessageSchema = z.object({
  path: z.string().min(1).max(1024),
  duration: z.number().positive().max(maxVoiceSeconds),
  peaks: z.array(z.number().min(0).max(1)).max(voiceWaveformBars),
});
export type VoiceMessage = z.infer<typeof voiceMessageSchema>;
