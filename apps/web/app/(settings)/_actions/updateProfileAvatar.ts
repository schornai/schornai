"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod/mini";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { getCurrentUserProfile } from "@schornio/aibox-package-database/user/getCurrentUserProfile";
import { replaceProfileAvatar } from "@schornio/aibox-package-database/user/replaceProfileAvatar";
import { saveUserAvatar } from "@schornio/aibox-package-database/user/saveUserAvatar";
export const updateProfileAvatar = serverActionClient
  .inputSchema(
    z.object({
      avatarUrl: z.optional(z.string()),
      targetUserId: z.optional(z.string()),
    }),
  )
  .action(async ({ parsedInput: { avatarUrl, targetUserId } }) => {
    if (targetUserId) {
      const supabaseServiceRole = await saveCreateSupabaseServiceRoleClient();
      await saveUserAvatar(targetUserId, avatarUrl, { supabaseServiceRole });
    } else {
      const supabase = await createSupabaseServerClient();
      const user = await getCurrentUserProfile({ supabase });
      await replaceProfileAvatar(user.id, avatarUrl, user.ownAvatarUrl, {
        supabase,
      });
    }
    revalidatePath("/");
  });
