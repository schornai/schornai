"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { preferencesSchema } from "@/lib/groupSortView/schemas";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { setCurrentUserConfig } from "@schornio/aibox-package-database/config/setCurrentUserConfig";
import { z } from "zod/mini";

export const savePreferences = serverActionClient
  .inputSchema(
    z.object({
      id: z.string(),
      preferences: preferencesSchema,
    }),
  )
  .action(async ({ parsedInput: { id, preferences } }) => {
    const configKey = `groupSortView-${id}` as const;
    const supabase = await createSupabaseServerClient();
    await setCurrentUserConfig(configKey, preferences ?? {}, { supabase });
    revalidatePath("/");
  });
