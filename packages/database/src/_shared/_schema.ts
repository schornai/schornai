import { z } from "zod/mini";

export const imageSchema = z.object({
  path: z.string(),
  storage: z.string(),
  type: z.literal("supabase-storage-path"),
});

export const appColorSchema = z.union([
  z.object({
    oklchHue: z.number(),
    type: z.literal("color-oklch-hue"),
  }),
  z.object({
    blue: z.number(),
    green: z.number(),
    opacity: z.optional(z.number()),
    red: z.number(),
    type: z.literal("color-rgb"),
  }),
]);

export const appIconSchema = z.object({
  iconName: z.string(),
  type: z.literal("icon-lucide"),
});
