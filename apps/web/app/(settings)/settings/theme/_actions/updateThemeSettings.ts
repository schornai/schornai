"use server";

import { revalidatePath, updateTag } from "next/cache";
import { saveThemeSettings } from "@schornio/aibox-package-database/config/saveThemeSettings";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { themeEditorSettingsSchema } from "@/lib/themeEditorSettings";

export const updateThemeSettings = serverActionClient
  .inputSchema(themeEditorSettingsSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    await saveThemeSettings(parsedInput, { supabase });
    updateTag("systemConfigTheme");
    updateTag("systemConfigWelcomeMessage");
    revalidatePath("/", "layout");
    revalidatePath("/settings/user/new");
  });
