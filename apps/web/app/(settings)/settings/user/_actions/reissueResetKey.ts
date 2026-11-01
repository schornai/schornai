"use server";

import { z } from "zod";
import { serverActionClient } from "@/lib/serverActionClient";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { reissuePasswordResetKey } from "@schornio/aibox-package-database/user/reissuePasswordResetKey";

export const reissueResetKey = serverActionClient
  .inputSchema(z.object({ userId: z.uuid() }))
  .action(async ({ parsedInput: { userId } }) => {
    const supabaseServiceRole = await saveCreateSupabaseServiceRoleClient();
    return reissuePasswordResetKey(userId, { supabaseServiceRole });
  });
