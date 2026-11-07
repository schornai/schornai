import type { SupabaseClient } from "../_shared/_types.ts";
import {
  themeEditorSettingsSchema,
  type ThemeEditorSettings,
} from "./themeEditorSettings.ts";
import {
  normalizeThemeSettings,
  normalizeWelcomeMessage,
} from "./themeSettings.ts";
import { setSystemConfigs } from "./setSystemConfigs.ts";

/** Caller must authorize a global administrator before supplying the client. */
export async function saveThemeSettings(
  input: ThemeEditorSettings,
  options: { supabase: SupabaseClient },
) {
  const parsed = themeEditorSettingsSchema.parse(input);
  await setSystemConfigs(
    {
      theme: JSON.stringify(normalizeThemeSettings(parsed.theme)),
      welcomeMessage: JSON.stringify({
        localized: normalizeWelcomeMessage(parsed.welcomeMessage),
      }),
      accessMessage: JSON.stringify({ localized: parsed.accessMessage }),
    },
    options,
  );
}
