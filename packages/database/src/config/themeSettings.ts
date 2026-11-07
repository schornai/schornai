import { z } from "zod/mini";
import type { Theme } from "./theme.ts";

export function isThemeLogoUrl(value: string) {
  if (/^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)) return true;
  try {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

const channel = z.number().check(z.int(), z.minimum(0), z.maximum(255));

export const themeSettingsSchema = z.object({
  version: z.literal("theme-v2"),
  colors: z.optional(
    z
      .array(
        z.object({
          id: z.string().check(z.minLength(1), z.maxLength(100)),
          name: z.string().check(z.trim(), z.minLength(1), z.maxLength(100)),
          color: z.union([
            z.object({
              type: z.literal("color-oklch-hue"),
              oklchHue: z.number().check(z.minimum(0), z.maximum(360)),
            }),
            z.object({
              type: z.literal("color-rgb"),
              red: channel,
              green: channel,
              blue: channel,
              opacity: z.optional(z.number().check(z.minimum(0), z.maximum(1))),
            }),
          ]),
        }),
      )
      .check(
        z.maxLength(64),
        z.refine(
          (colors) =>
            new Set(colors.map(({ id }) => id)).size === colors.length,
        ),
      ),
  ),
  logo: z.optional(
    z.record(
      z.string(),
      z.object({
        url: z.string().check(z.trim(), z.refine(isThemeLogoUrl)),
        alt: z.optional(z.string().check(z.maxLength(300))),
      }),
    ),
  ),
});

// Empty URL fields remove the override and restore the existing logo fallback.
export function normalizeThemeSettings(theme: Theme): Theme {
  const logo = Object.fromEntries(
    Object.entries(theme.logo ?? {}).filter(([, value]) => value.url.trim()),
  );
  return { ...theme, logo: Object.keys(logo).length ? logo : undefined };
}

export const welcomeMessageSettingsSchema = z.object({
  localized: z.record(z.string(), z.string().check(z.maxLength(20000))),
});

export function normalizeWelcomeMessage(localized: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(localized).filter(([, text]) => text.trim().length > 0),
  );
}
