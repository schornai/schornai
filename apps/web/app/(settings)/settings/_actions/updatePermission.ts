"use server";

import { revalidatePath } from "next/cache";
import { roleNameSchema } from "@schornio/aibox-package-database/auth/_schemas";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { updateUserPermission } from "@schornio/aibox-package-database/user/updateUserPermission";
import { z } from "zod/mini";

export const updatePermission = serverActionClient
  .inputSchema(
    z.object({
      role: z._default(z.union([roleNameSchema, z.literal("none")]), "none"),
      userId: z.string(),
      workspaceId: z.string(),
    }),
  )
  .action(async ({ parsedInput: { role, userId, workspaceId } }) => {
    const supabaseServiceRole = await saveCreateSupabaseServiceRoleClient();

    await updateUserPermission(
      { role, userId, workspaceId },
      { supabaseServiceRole },
    );

    revalidatePath("/");
  });
