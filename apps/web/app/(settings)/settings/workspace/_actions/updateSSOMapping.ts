"use server";

import { revalidatePath } from "next/cache";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { updateWorkspaceSSOMapping } from "@schornio/aibox-package-database/workspace/updateWorkspaceSSOMapping";
import { z } from "zod/mini";

export const updateSSOMapping = serverActionClient
  .inputSchema(
    z.object({
      samlMappingEditor: z.optional(z.string()),
      samlMappingUser: z.optional(z.string()),
      samlMappingWorkspaceAdmin: z.optional(z.string()),
      workspaceId: z.string(),
    }),
  )
  .action(
    async ({
      parsedInput: {
        samlMappingEditor,
        samlMappingUser,
        samlMappingWorkspaceAdmin,
        workspaceId,
      },
    }) => {
      const supabaseServiceRole = await saveCreateSupabaseServiceRoleClient();
      await updateWorkspaceSSOMapping(
        workspaceId,
        { samlMappingEditor, samlMappingUser, samlMappingWorkspaceAdmin },
        { supabaseServiceRole },
      );

      revalidatePath("/");
    },
  );
