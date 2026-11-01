"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { safeRedirectPath } from "@/lib/safeRedirectPath";
import { redirect } from "next/navigation";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/mini";

export const signInWithPassword = serverActionClient
  .inputSchema(
    z.object({
      email: z.email(),
      next: z.optional(z.string()),
      password: z.string(),
    }),
  )
  .action(async ({ parsedInput: { email, next, password } }) => {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error("Unauthorized");
    }

    redirect(safeRedirectPath(next));
  });
