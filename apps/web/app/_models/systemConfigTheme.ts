import { createSupabaseAnonClient } from "@/lib/supabase/createSupabaseAnonClient";
import { getSystemConfig } from "@schornio/aibox-package-database/config/getSystemConfig";
import { trySync } from "@schornio/aibox-package-utils/trySync";
import { z } from "zod/mini";
import { themeColorSchema, themeSchema } from "@/lib/theme";
export { themeColorSchema, themeSchema } from "@/lib/theme";
export type { Theme } from "@/lib/theme";

const themeLegacySchema = z.object({
  chatbot: z.optional(
    z.object({
      colors: z.array(
        z.object({
          color: themeColorSchema,
          name: z.string(),
        }),
      ),
    }),
  ),
  logo: z.optional(
    z.object({
      url: z.string(),
    }),
  ),
});

const themeWithLegacySupportSchema = z.union([themeSchema, themeLegacySchema]);

function isLegacyTheme(
  theme: z.infer<typeof themeWithLegacySupportSchema>,
): theme is z.infer<typeof themeLegacySchema> {
  return !("version" in theme);
}

export async function getSystemConfigTheme(): Promise<
  z.infer<typeof themeSchema>
> {
  const supabase = createSupabaseAnonClient();
  const themeConfigString = await getSystemConfig("theme", { supabase });

  const { data: parsedThemeConfig } = trySync(
    () => JSON.parse(themeConfigString ?? "") as unknown,
  );

  const { data: themeWithLegacySupportConfig } =
    themeWithLegacySupportSchema.safeParse(parsedThemeConfig);

  if (!themeWithLegacySupportConfig) {
    return {
      version: "theme-v2",
    };
  }

  const legacyLogoDe = isLegacyTheme(themeWithLegacySupportConfig)
    ? themeWithLegacySupportConfig.logo
    : undefined;

  const legacyLogo = legacyLogoDe ? { de: legacyLogoDe } : undefined;

  return {
    colors: isLegacyTheme(themeWithLegacySupportConfig)
      ? themeWithLegacySupportConfig.chatbot?.colors.map((color) => ({
          ...color,
          id: crypto.randomUUID(),
        }))
      : themeWithLegacySupportConfig?.colors,
    logo: isLegacyTheme(themeWithLegacySupportConfig)
      ? legacyLogo
      : themeWithLegacySupportConfig.logo,
    version: "theme-v2",
  };
}
