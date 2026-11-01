import {
  appColorSchema,
  appIconSchema,
  imageSchema,
} from "../_shared/_schema.ts";
import { aiModelMLXWhisperV1Schema } from "../aiModel/_schema.ts";
import { z } from "zod/mini";

export const transcriptionRetryLevelSchema = z.enum([
  "fast",
  "balanced",
  "thorough",
]);

const transcriberIconLegacySchema = z.object({
  iconName: z.string(),
  type: z.literal("icon-lucide"),
});

export const transcriberConfigLegacySchema = z.object({
  color: appColorSchema,
  icon: transcriberIconLegacySchema,
  identifier: z.optional(z.string()),
  image: z.optional(imageSchema),
  modelIdentifier: z.optional(z.string()),
  retryLevel: z.optional(transcriptionRetryLevelSchema),
  version: z.literal("transcriber-config-version-1"),
});

export const transcriberLegacySchema = z.object({
  config: transcriberConfigLegacySchema,
  createdAt: z.date(),
  description: z.optional(z.string()),
  id: z.string(),
  model: aiModelMLXWhisperV1Schema
    .extend({
      identifier: z.string(),
    })
    .optional(),
  modelId: z.optional(z.string()),
  name: z._default(z.string(), ""),
  organizationId: z.string(),
  prompt: z.optional(z.string()),
});

export const transcriberSchema = z.object({
  color: z.optional(appColorSchema),
  description: z.optional(z.string()),
  icon: z.optional(appIconSchema),
  id: z.string(),
  identifier: z.string(),
  modelIdentifier: z.optional(z.string()),
  name: z.string(),
  prompt: z.optional(z.string()),
  retryLevel: z.optional(transcriptionRetryLevelSchema),
  version: z.literal("transcriber-v2"),
  workspaceId: z.string(),
});
