import { z } from "zod";

export const chatExpirationSchema = z.object({
  agentId: z.string().regex(/^[a-zA-Z0-9-]+$/),
  activityId: z.uuid(),
  seconds: z.number().int().min(60).max(31_536_000).multipleOf(60).nullable(),
});
export const chatExpirationJobSchema = z.object({
  documentName: z
    .string()
    .regex(/^activity_chat___[0-9a-fA-F-]{36}_[a-zA-Z0-9-]+$/),
});
export type ChatExpiration = {
  seconds: number | null;
  expiresAt: string | null;
};
