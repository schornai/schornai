"use server";

import { createAgentInputSchema } from "@schornio/aibox-package-database/agent/_schemas";
import { createAgent as createAgentDatabase } from "@schornio/aibox-package-database/agent/createAgent";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAgentById } from "@schornio/aibox-package-database/agent/getAgentById";
import { requireWorkspaceAdmin } from "@/lib/requireWorkspaceAdmin";
import { getWorkspaceAdminContext } from "@/lib/supabase/getWorkspaceAdminContext";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { returnValidationErrors } from "next-safe-action";

export const createAgent = serverActionClient
  .inputSchema(createAgentInputSchema)
  .action(async ({ parsedInput: { agent, copyFromAgentId, globalId } }) => {
    const supabase = await createSupabaseServerClient();
    let copyFrom;
    if (copyFromAgentId) {
      const source = await getAgentById(copyFromAgentId, { supabase });
      await requireWorkspaceAdmin(source.workspaceId, supabase);
      copyFrom = { agentId: source.id, workspaceId: source.workspaceId };
    }
    const { supabaseServiceRole } = await getWorkspaceAdminContext(
      agent.workspaceId,
    );
    const { agentId } = await createAgentDatabase(agent, {
      supabaseServiceRole,
      copyFrom,
      globalId,
    }).catch((error: unknown) => {
      if (error instanceof Error && error.message === "XRAG_IDENTITY_EXISTS")
        returnValidationErrors(createAgentInputSchema, {
          globalId: { _errors: ["XRAG_IDENTITY_EXISTS"] },
        });
      throw error;
    });
    revalidatePath("/");
    redirect(`/agent/${agentId}`);
  });
