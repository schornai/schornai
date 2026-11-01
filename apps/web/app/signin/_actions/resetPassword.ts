"use server";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { redeemPasswordResetKey } from "@schornio/aibox-package-database/user/redeemPasswordResetKey";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod";

export const resetPassword = serverActionClient
  .inputSchema(
    z
      .object({
        email: z.string().trim().pipe(z.email()),
        password: z.string().min(6).max(1024),
        passwordAgain: z.string(),
        passwordResetKey: z.string().trim().min(1).max(256),
      })
      .refine((value) => value.password === value.passwordAgain, {
        path: ["passwordAgain"],
      }),
  )
  .action(async ({ parsedInput }) => {
    await redeemPasswordResetKey(parsedInput, {
      supabaseServiceRole: createSupabaseServiceRoleClient(),
    });
    return { success: true };
  });
