"use server";
import { z } from "zod";
import { getExternalAIModelConnection } from "@schornio/aibox-package-database/aiModel/getExternalAIModelConnection";
import { serverActionClient } from "@/lib/serverActionClient";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { externalModelInputSchema } from "../externalModelInputSchema";
import { listExternalModels } from "@schornio/aibox-realtime/models/listExternalModels";
export const discoverModels = serverActionClient
  .inputSchema(
    z.union([
      z.object({ id: z.string().min(1) }).strict(),
      externalModelInputSchema,
    ]),
  )
  .action(async ({ parsedInput }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    if ("id" in parsedInput) {
      const { config, apiKey } = await getExternalAIModelConnection(
        { id: parsedInput.id },
        { supabase },
      );
      // Stored credentials are only sent to the stored connection, never a client-supplied URL.
      return listExternalModels({ ...config, apiKey });
    }
    return listExternalModels(parsedInput);
  });
