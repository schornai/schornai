"use server";

import { revalidatePath } from "next/cache";
import { setSystemConfig } from "@schornio/aibox-package-database/config/setSystemConfig";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { accessMessageSchema } from "@/lib/accessMessage";

export const updateAccessMessage = serverActionClient
  .inputSchema(accessMessageSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    await setSystemConfig("accessMessage", JSON.stringify(parsedInput), {
      supabase,
    });
    revalidatePath("/settings/theme");
    revalidatePath("/settings/user/new");
  });
