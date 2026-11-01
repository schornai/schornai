"use server";

import { revalidatePath } from "next/cache";
import { getWorkspaceAdminContext } from "@/lib/supabase/getWorkspaceAdminContext";
import { serverActionClient } from "@/lib/serverActionClient";

import { updateWorkspaceDescription } from "@schornio/aibox-package-database/workspace/updateWorkspaceDescription";
import { z } from "zod/mini";

export const updateDescription = serverActionClient
  .inputSchema(
    z.object({
      description: z._default(z.string(), ""),
      name: z._default(z.string(), ""),
      workspaceId: z.string(),
    }),
  )
  .action(async ({ parsedInput: { description, name, workspaceId } }) => {
    const { supabaseServiceRole } = await getWorkspaceAdminContext(workspaceId);
    await updateWorkspaceDescription(
      workspaceId,
      { description, name },
      { supabaseServiceRole },
    );

    revalidatePath("/");
  });
