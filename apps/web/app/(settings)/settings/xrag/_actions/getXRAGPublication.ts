"use server";
import { z } from "zod";
import { serverActionClient } from "@/lib/serverActionClient";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { getArtifactPublication } from "@schornio/aibox-package-database/xrag/getArtifactPublication";

export const getXRAGPublication = serverActionClient
  .inputSchema(z.object({ id: z.uuid() }))
  .action(async ({ parsedInput: { id } }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    return getArtifactPublication(id, { supabase });
  });
