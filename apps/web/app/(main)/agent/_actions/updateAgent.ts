"use server";

import { agentSchema } from "@schornio/aibox-package-database/agent/_schemas";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { updateAgent as updateAgentDatabase } from "@schornio/aibox-package-database/agent/updateAgent";
import { z } from "zod/mini";

export const updateAgent = serverActionClient
  .inputSchema(z.object({ agent: agentSchema }))
  .action(async ({ parsedInput: { agent } }) => {
    const supabase = await createSupabaseServerClient();
    await updateAgentDatabase(agent, { supabase });
    revalidatePath("/");
  });
