"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { externalModelInputSchema } from "../externalModelInputSchema";
import { updateExternalAIModel } from "@schornio/aibox-package-database/aiModel/updateExternalAIModel";
export const updateExternalModel = serverActionClient
  .inputSchema(
    externalModelInputSchema.and(z.object({ id: z.string().min(1) })),
  )
  .action(async ({ parsedInput }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    await updateExternalAIModel(parsedInput, { supabase });
    revalidatePath("/models");
    revalidatePath(`/models/${parsedInput.id}`);
    return { id: parsedInput.id };
  });
