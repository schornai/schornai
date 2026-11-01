"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { revalidatePath } from "next/cache";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { updateCurrentUserProfileName } from "@schornio/aibox-package-database/user/updateCurrentUserProfileName";
import { updateUserProfileName } from "@schornio/aibox-package-database/user/updateUserProfileName";
import { z } from "zod/mini";

export const updateProfileName = serverActionClient
  .inputSchema(
    z.object({
      firstName: z._default(z.string(), ""),
      lastName: z._default(z.string(), ""),
      targetUserId: z.optional(z.string()),
    }),
  )
  .action(async ({ parsedInput: { firstName, lastName, targetUserId } }) => {
    if (targetUserId) {
      const supabaseServiceRole = await saveCreateSupabaseServiceRoleClient();
      await updateUserProfileName(
        targetUserId,
        { firstName, lastName },
        { supabaseServiceRole },
      );
    } else {
      const supabase = await createSupabaseServerClient();
      await updateCurrentUserProfileName({ firstName, lastName }, { supabase });
    }

    revalidatePath("/");
  });
