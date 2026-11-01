"use server";

import { revalidatePath, updateTag } from "next/cache";
import { setSystemConfig } from "@schornio/aibox-package-database/config/setSystemConfig";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { themeSettingsSchema } from "@/lib/themeSettings";

export const updateTheme = serverActionClient
  .inputSchema(themeSettingsSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    await setSystemConfig("theme", JSON.stringify(parsedInput), { supabase });
    updateTag("systemConfigTheme");
    revalidatePath("/", "layout");
  });
