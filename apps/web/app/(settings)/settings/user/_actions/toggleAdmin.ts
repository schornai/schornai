"use server";

import { revalidatePath } from "next/cache";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { toggleAdmin as toggleAdminDB } from "@schornio/aibox-package-database/user/toggleAdmin";
import { z } from "zod";

export const toggleAdmin = serverActionClient
  .inputSchema(
    z.object({
      toggle: z.enum(["promoteToAdmin", "demoteFromAdmin"]),
      userId: z.uuid(),
    }),
  )
  .action(async ({ parsedInput: { userId, toggle } }) => {
    const supabaseServiceRole = await saveCreateSupabaseServiceRoleClient();
    await toggleAdminDB(toggle, userId, { supabaseServiceRole });
    revalidatePath(`/settings/user/${userId}`);
  });
