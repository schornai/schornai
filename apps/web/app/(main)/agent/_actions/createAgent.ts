"use server";

import { agentSchema } from "@schornio/aibox-package-database/agent/_schemas";
import { createAgent as createAgentDatabase } from "@schornio/aibox-package-database/agent/createAgent";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAgentById } from "@schornio/aibox-package-database/agent/getAgentById";
import { requireWorkspaceAdmin } from "@/lib/requireWorkspaceAdmin";
import { getWorkspaceAdminContext } from "@/lib/supabase/getWorkspaceAdminContext";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/mini";

export const createAgent = serverActionClient
  .inputSchema(
    z.object({ agent: agentSchema, copyFromAgentId: z.optional(z.string()) }),
  )
  .action(async ({ parsedInput: { agent, copyFromAgentId } }) => {
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
    });
    revalidatePath("/");
    redirect(`/agent/${agentId}`);
  });
