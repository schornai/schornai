import { getServiceFixture } from "../../../service-fixtures";
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
export const getSystemConfigTheme = async () =>
  getServiceFixture("getSystemConfigTheme", {
    version: "theme-v2",
    colors: [
      {
        color: { oklchHue: 284, type: "color-oklch-hue" },
        id: "11111111-1111-4111-8111-111111111111",
        name: "Beispiel",
      },
    ],
    logo: {},
  });
