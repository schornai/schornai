import { cacheTag } from "next/cache";
import { createSupabaseAnonClient } from "@/lib/supabase/createSupabaseAnonClient";
import { getAIModelById } from "@schornio/aibox-package-database/aiModel/getAIModelById";
import { getSystemConfig } from "@schornio/aibox-package-database/config/getSystemConfig";
import { trySync } from "@schornio/aibox-package-utils/trySync";
import { z } from "zod/mini";

export const defaultModelSchema = z.object({
  modelIdentifier: z.string(),
  version: z.literal("default-model-v2"),
});

export type DefaultModel = z.infer<typeof defaultModelSchema>;

export async function getSystemConfigDefaultModel(): Promise<
  z.infer<typeof defaultModelSchema> | undefined
> {
  "use cache: private";
  cacheTag("systemConfigDefaultModel");

  const supabase = createSupabaseAnonClient();
  const defaultConfigString = await getSystemConfig("defaultModel", {
    supabase,
  });

  const { data: parsedDefaultModelConfig } = trySync(
    () => JSON.parse(defaultConfigString ?? "") as unknown,
  );

  const { data: defaultModel } = defaultModelSchema.safeParse(
    parsedDefaultModelConfig,
  );

  if (!defaultModel) {
    const legacyDefaultModelId = await getSystemConfig("defaultOllamaModelId", {
      supabase,
    });

    if (legacyDefaultModelId) {
      const model = await getAIModelById(legacyDefaultModelId, { supabase });
      return {
        modelIdentifier: model.identifier,
        version: "default-model-v2",
      };
    }
  }

  return defaultModel;
}
