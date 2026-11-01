"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { deleteCurrentUserAvatar } from "@schornio/aibox-package-database/user/deleteCurrentUserAvatar";
import { deleteUserAvatar } from "@schornio/aibox-package-database/user/deleteUserAvatar";
import { getCurrentUserProfile } from "@schornio/aibox-package-database/user/getCurrentUserProfile";
import { getUserById } from "@schornio/aibox-package-database/user/getUserById";
import { revalidatePath } from "next/cache";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { updateCurrentUserAvatar } from "@schornio/aibox-package-database/user/updateCurrentUserAvatar";
import { updateUserAvatar } from "@schornio/aibox-package-database/user/updateUserAvatar";
import { z } from "zod/mini";

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

      const user = await getUserById(targetUserId, { supabaseServiceRole });
      if (user.ownAvatarUrl && user.ownAvatarUrl !== avatarUrl) {
        await supabaseServiceRole.storage
          .from("user_avatars")
          .remove([user.ownAvatarUrl.replace(/^user_avatars\//, "")]);
      }

      if (avatarUrl) {
        await updateUserAvatar(user.id, { avatarUrl }, { supabaseServiceRole });
      } else {
        await deleteUserAvatar(user.id, { supabaseServiceRole });
      }
    } else {
      const supabase = await createSupabaseServerClient();

      const userProfile = await getCurrentUserProfile({ supabase });
      if (userProfile.ownAvatarUrl && userProfile.ownAvatarUrl !== avatarUrl) {
        await supabase.storage
          .from("user_avatars")
          .remove([userProfile.ownAvatarUrl.replace(/^user_avatars\//, "")]);
      }

      if (avatarUrl) {
        await updateCurrentUserAvatar({ avatarUrl }, { supabase });
      } else {
        await deleteCurrentUserAvatar({ supabase });
      }
    }

    revalidatePath("/");
  });
