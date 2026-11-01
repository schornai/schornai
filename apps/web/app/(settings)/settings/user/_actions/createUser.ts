"use server";

import { createUserWithResetKey } from "@schornio/aibox-package-database/user/createUserWithResetKey";
import { revalidatePath } from "next/cache";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod";

export const createUser = serverActionClient
  .inputSchema(
    z.object({
      email: z.string().trim().pipe(z.email()),
      firstName: z.string().trim().max(200).optional(),
      lastName: z.string().trim().max(200).optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const supabaseServiceRole = await saveCreateSupabaseServiceRoleClient();
    const result = await createUserWithResetKey(parsedInput, {
      supabaseServiceRole,
    });
    revalidatePath("/settings/user");
    return result;
  });
