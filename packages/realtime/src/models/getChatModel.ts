import { createExternalLanguageModel } from "./createExternalLanguageModel.ts";
import { aiboxModel } from "../_lib/aiboxModel.ts";
import type { SupabaseClient } from "@schornio/aibox-package-database/_shared/_types";
import { getExternalAIModelConnection } from "@schornio/aibox-package-database/aiModel/getExternalAIModelConnection";

export async function getChatModel(
  identifier: string,
  context: Parameters<typeof aiboxModel>[1] & {
    supabaseServiceRole: SupabaseClient;
    abortSignal?: AbortSignal;
  },
) {
  if (!identifier.startsWith("external:"))
    return aiboxModel(identifier, context);
  const { config, apiKey } = await getExternalAIModelConnection(
    { identifier },
    {
      supabase: context.supabaseServiceRole,
      abortSignal: context.abortSignal,
    },
  );
  return createExternalLanguageModel(config, apiKey);
}
