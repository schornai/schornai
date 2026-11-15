import { withContextCompression } from "./withContextCompression.ts";
import type { ContextCompressionListener } from "./withContextCompression.ts";
import { getAIModelByOllamaIdentifier } from "@schornio/aibox-package-database/aiModel/getAIModelByOllamaIdentifier";
import { createExternalLanguageModel } from "./createExternalLanguageModel.ts";
import { aiboxModel } from "../_lib/aiboxModel.ts";
import type { SupabaseClient } from "@schornio/aibox-package-database/_shared/_types";
import { getExternalAIModelConnection } from "@schornio/aibox-package-database/aiModel/getExternalAIModelConnection";

export async function getChatModel(
  identifier: string,
  context: Parameters<typeof aiboxModel>[1] & {
    supabaseServiceRole: SupabaseClient;
    abortSignal?: AbortSignal;
    onCompression?: ContextCompressionListener;
  },
) {
  if (!identifier.startsWith("external:")) {
    let metadata: ReturnType<typeof getAIModelByOllamaIdentifier> | undefined;
    return withContextCompression(
      aiboxModel(identifier, context),
      async () => {
        metadata ??= getAIModelByOllamaIdentifier(identifier, {
          supabase: context.supabaseServiceRole,
          abortSignal: context.abortSignal,
        });
        const model = await metadata;
        return "contextSize" in model.config
          ? model.config.contextSize
          : undefined;
      },
      context.onCompression,
    );
  }
  const { config, apiKey } = await getExternalAIModelConnection(
    { identifier },
    {
      supabase: context.supabaseServiceRole,
      abortSignal: context.abortSignal,
    },
  );
  return withContextCompression(
    createExternalLanguageModel(config, apiKey),
    async () => config.contextSize,
    context.onCompression,
  );
}
