"use server";

import { revalidatePath, updateTag } from "next/cache";
import { setSystemConfig } from "@schornio/aibox-package-database/config/setSystemConfig";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import {
  normalizeWelcomeMessage,
  welcomeMessageSettingsSchema,
} from "@/lib/themeSettings";

export const updateWelcomeMessage = serverActionClient
  .inputSchema(welcomeMessageSettingsSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    await setSystemConfig(
      "welcomeMessage",
      JSON.stringify({
        localized: normalizeWelcomeMessage(parsedInput.localized),
      }),
      { supabase },
    );
    updateTag("systemConfigWelcomeMessage");
    revalidatePath("/", "layout");
  });
