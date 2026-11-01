"use server";

import { revalidatePath } from "next/cache";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { updateWorkspaceAutoJoin } from "@schornio/aibox-package-database/workspace/updateWorkspaceAutoJoin";
import { z } from "zod/mini";

export const updateAutoJoin = serverActionClient
  .inputSchema(
    z.object({
      autoJoin: z.boolean(),
      workspaceId: z.string(),
    }),
  )
  .action(async ({ parsedInput: { autoJoin, workspaceId } }) => {
    const supabaseServiceRole = await saveCreateSupabaseServiceRoleClient();
    await updateWorkspaceAutoJoin(
      workspaceId,
      { autoJoin },
      { supabaseServiceRole },
    );

    revalidatePath("/");
  });
