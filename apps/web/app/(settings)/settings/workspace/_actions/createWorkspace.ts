"use server";

import { createWorkspace as createWorkspaceDatabase } from "@schornio/aibox-package-database/workspace/createWorkspace";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/mini";

export const createWorkspace = serverActionClient
  .inputSchema(
    z.object({
      description: z._default(z.string(), ""),
      name: z.string().check(z.trim(), z.minLength(1)),
    }),
  )
  .action(async ({ parsedInput }) => {
    const supabaseServiceRole = await saveCreateSupabaseServiceRoleClient();
    const { workspaceId } = await createWorkspaceDatabase(parsedInput, {
      supabaseServiceRole,
    });
    revalidatePath("/", "layout");
    redirect(`/settings/workspace/${workspaceId}`);
  });
