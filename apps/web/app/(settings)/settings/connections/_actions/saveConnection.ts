"use server";

import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { saveConnectionSettings } from "@schornio/aibox-package-database/connections/saveConnectionSettings";
import { connectionInputSchema } from "../connectionInputSchema";

export const saveConnection = serverActionClient
  .inputSchema(connectionInputSchema)
  .action(async ({ parsedInput: input }) => {
    const options = { supabase: await saveCreateSupabaseServiceRoleClient() };
    const { id } = await saveConnectionSettings(input, options);
    revalidatePath("/settings/connections");
    return { id };
  });
