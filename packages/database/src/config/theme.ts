import { z } from "zod/mini";

export const themeColorSchema = z.union([
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

export const themeSchema = z.object({
  colors: z.optional(
    z.array(
      z.object({
        color: themeColorSchema,
        id: z.string(),
        name: z.string(),
      }),
    ),
  ),
  logo: z.optional(
    z.record(
      z.string(),
      z.object({
        alt: z.optional(z.string()),
        url: z.string(),
      }),
    ),
  ),
  version: z.literal("theme-v2"),
});

export type Theme = z.infer<typeof themeSchema>;
