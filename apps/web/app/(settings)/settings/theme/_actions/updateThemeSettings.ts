"use server";

import { revalidatePath, updateTag } from "next/cache";
import { setSystemConfigs } from "@schornio/aibox-package-database/config/setSystemConfigs";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { themeEditorSettingsSchema } from "@/lib/themeEditorSettings";
import {
  normalizeThemeSettings,
  normalizeWelcomeMessage,
} from "@/lib/themeSettings";

export const updateThemeSettings = serverActionClient
  .inputSchema(themeEditorSettingsSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    await setSystemConfigs(
      {
        theme: JSON.stringify(normalizeThemeSettings(parsedInput.theme)),
        welcomeMessage: JSON.stringify({
          localized: normalizeWelcomeMessage(parsedInput.welcomeMessage),
        }),
        accessMessage: JSON.stringify({ localized: parsedInput.accessMessage }),
      },
      { supabase },
    );
    updateTag("systemConfigTheme");
    updateTag("systemConfigWelcomeMessage");
    revalidatePath("/", "layout");
    revalidatePath("/settings/user/new");
  });
