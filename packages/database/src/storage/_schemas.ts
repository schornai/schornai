import { z } from "zod/mini";

export const storageSchema = z.union([
  z.object({
    activityId: z.string(),
    agentId: z.string(),
    type: z.literal("activity"),
  }),
  z.object({
    activityId: z.string(),
    transcriberId: z.string(),
    type: z.literal("activity-transcription"),
  }),
  z.object({
    documentRepositoryId: z.string(),
    type: z.literal("documentRepository"),
    workspaceId: z.optional(z.string()),
  }),
]);

export const transcriptionSegmentSchema = z.object({
  noSpeechProbability: z.number(),
  reviewed: z.optional(z.boolean()),
  segmentOverride: z.optional(z.string()),
  timeEnd: z.number(),
  timeStart: z.number(),
  words: z.array(
    z.object({
      probability: z.number(),
      timeEnd: z.number(),
      timeStart: z.number(),
      word: z.string(),
      wordOverride: z.optional(z.string()),
    }),
  ),
});
export const transcriptionSchema = z.object({
  textOverride: z.optional(z.string()),
  segments: z.array(transcriptionSegmentSchema),
});
