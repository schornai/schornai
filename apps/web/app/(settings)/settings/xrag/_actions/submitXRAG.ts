"use server";

import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { publishArtifact } from "@schornio/aibox-package-database/xrag/publishArtifact";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod";

export const submitXRAG = serverActionClient
  .inputSchema(
    z.object({
      actionFileName: z
        .string()
        .min(1)
        .max(310)
        .regex(/^(?:uploads\/[0-9a-f-]{36}\/)?[^/\\]+$/i)
        .refine((value) => value !== "." && value !== ".."),
    }),
  )
  .action(async ({ parsedInput: { actionFileName } }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    const id = await publishArtifact(actionFileName, { supabase });
    revalidatePath("/settings/xrag");
    revalidatePath("/models");
    revalidatePath("/artifacts");
    return { id };
  });
