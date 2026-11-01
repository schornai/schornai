"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { updateAIModelMetadata } from "@schornio/aibox-package-database/aiModel/updateAIModelMetadata";
export const updateModelMetadata = serverActionClient
  .inputSchema(
    z.object({
      id: z.string().min(1),
      name: z.string().trim().min(1).max(500),
      description: z.string().max(100_000),
    }),
  )
  .action(async ({ parsedInput }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    const id = await updateAIModelMetadata(parsedInput, { supabase });
    revalidatePath("/", "layout");
    return { id };
  });
