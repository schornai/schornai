"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { deleteAIModel } from "@schornio/aibox-package-database/aiModel/deleteAIModel";
export const deleteModel = serverActionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    await deleteAIModel(parsedInput.id, { supabase });
    revalidatePath("/", "layout");
    return { id: parsedInput.id };
  });
