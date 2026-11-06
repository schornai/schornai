"use server";

import { agentSchema } from "@schornio/aibox-package-database/agent/_schemas";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAgentById } from "@schornio/aibox-package-database/agent/getAgentById";
import { requireWorkspaceAdmin } from "@/lib/requireWorkspaceAdmin";
import { getWorkspaceAdminContext } from "@/lib/supabase/getWorkspaceAdminContext";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { updateAgent as updateAgentDatabase } from "@schornio/aibox-package-database/agent/updateAgent";
import { z } from "zod/mini";

export const updateAgent = serverActionClient
  .inputSchema(z.object({ agent: agentSchema }))
  .action(async ({ parsedInput: { agent } }) => {
    const supabase = await createSupabaseServerClient();
    const saved = await getAgentById(agent.id, { supabase });
    await requireWorkspaceAdmin(saved.workspaceId, supabase);
    const { supabaseServiceRole } = await getWorkspaceAdminContext(
      agent.workspaceId,
    );
    await updateAgentDatabase(agent, {
      supabaseServiceRole,
      expectedWorkspaceId: saved.workspaceId,
    });
    revalidatePath("/");
    revalidatePath(`/agent/${agent.id}`, "layout");
  });
