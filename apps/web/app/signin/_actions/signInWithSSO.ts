"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";
import { redirect } from "next/navigation";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/mini";

export const signInWithSSO = serverActionClient
  .inputSchema(
    z.object({
      providerId: z.uuid(),
    }),
  )
  .action(async ({ parsedInput: { providerId } }) => {
    const supabase = await createSupabaseServerClient();

    const SITE_URL = getEnvSafe("SITE_URL");

    const { data, error } = await supabase.auth.signInWithSSO({
      options: {
        redirectTo: `${SITE_URL}/api/auth/callback`,
      },
      providerId,
    });

    if (error) {
      throw new Error("Unauthorized");
    }

    redirect(data.url);
  });
