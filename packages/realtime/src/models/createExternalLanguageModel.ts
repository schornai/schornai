import { createOpenAI } from "@ai-sdk/openai";
import { createAzure } from "@ai-sdk/azure";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { createHuggingFace } from "@ai-sdk/huggingface";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ExternalModelProvider } from "@schornio/aibox-package-database/aiModel/_schema";

export function createExternalLanguageModel(
  config: {
    provider: ExternalModelProvider;
    baseUrl: string;
    modelId: string;
    region?: string;
  },
  apiKey: string,
) {
  // Never use this server's environment credentials for a user-configured provider.
  if (!apiKey && config.provider !== "openai-compatible")
    throw new Error("MODEL_API_KEY_REQUIRED");
  const options = {
    apiKey,
    baseURL: config.baseUrl,
    fetch: ((input, init) =>
      fetch(input, { ...init, redirect: "error" })) as typeof fetch,
  };
  switch (config.provider) {
    case "openai":
      return createOpenAI(options).responses(config.modelId);
    case "openai-azure":
      return createAzure(options).responses(config.modelId);
    case "antropic":
      return createAnthropic(options)(config.modelId);
    case "antropic-aws": {
      if (!config.region) throw new Error("MODEL_REGION_REQUIRED");
      return createAmazonBedrock({ ...options, region: config.region })(
        config.modelId,
      );
    }
    case "google":
      return createGoogleGenerativeAI(options)(config.modelId);
    case "mistral":
      return createMistral(options)(config.modelId);
    case "huggingface":
      return createHuggingFace(options).responses(config.modelId);
    case "openai-compatible":
      return createOpenAICompatible({ ...options, name: "external" }).chatModel(
        config.modelId,
      );
  }
}
