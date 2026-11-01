"use server";

import { revalidatePath } from "next/cache";
import { getWorkspaceAdminContext } from "@/lib/supabase/getWorkspaceAdminContext";
import { serverActionClient } from "@/lib/serverActionClient";

import { updateWorkspaceDocumentation } from "@schornio/aibox-package-database/workspace/updateWorkspaceDocumentation";
import { z } from "zod/mini";

export const updateDocs = serverActionClient
  .inputSchema(
    z.object({
      docs: z._default(z.string(), ""),
      workspaceId: z.string(),
    }),
  )
  .action(async ({ parsedInput: { docs, workspaceId } }) => {
    const { supabaseServiceRole } = await getWorkspaceAdminContext(workspaceId);
    await updateWorkspaceDocumentation(
      workspaceId,
      { documentation: docs },
      { supabaseServiceRole },
    );

    revalidatePath("/");
  });
