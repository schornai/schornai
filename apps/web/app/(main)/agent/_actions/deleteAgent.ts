"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { deleteAgent as deleteAgentDatabase } from "@schornio/aibox-package-database/agent/deleteAgent";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/mini";

export const deleteAgent = serverActionClient
  .inputSchema(z.object({ agentId: z.string() }))
  .action(async ({ parsedInput: { agentId } }) => {
    const supabase = await createSupabaseServerClient();
    await deleteAgentDatabase(agentId, { supabase });
    revalidatePath("/");
    redirect(`/agent`);
  });
