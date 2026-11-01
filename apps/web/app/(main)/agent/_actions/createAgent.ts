"use server";

import { agentSchema } from "@schornio/aibox-package-database/agent/_schemas";
import { createAgent as createAgentDatabase } from "@schornio/aibox-package-database/agent/createAgent";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/mini";

export const createAgent = serverActionClient
  .inputSchema(z.object({ agent: agentSchema }))
  .action(async ({ parsedInput: { agent } }) => {
    const supabase = await createSupabaseServerClient();
    const { agentId } = await createAgentDatabase(agent, { supabase });
    revalidatePath("/");
    redirect(`/agent/${agentId}`);
  });
