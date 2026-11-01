"use server";

import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { externalModelInputSchema } from "../externalModelInputSchema";
import { createExternalAIModel } from "@schornio/aibox-package-database/aiModel/createExternalAIModel";

export const addExternalModel = serverActionClient
  .inputSchema(externalModelInputSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    if (parsedInput.provider !== "openai-compatible" && !parsedInput.apiKey)
      throw new Error("MODEL_API_KEY_REQUIRED");
    const id = await createExternalAIModel(parsedInput, { supabase });
    revalidatePath("/models");
    return { id };
  });
