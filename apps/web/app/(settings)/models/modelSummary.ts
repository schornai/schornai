import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";

export function toModelSummary(
  model: AIModel,
  { includeConnectionDetails = false } = {},
) {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    identifier: model.identifier,
    type: model.type,
    contextSize:
      "contextSize" in model.config ? model.config.contextSize : undefined,
    embeddingVectorSize:
      "embeddingVectorSize" in model.config
        ? model.config.embeddingVectorSize
        : undefined,
    featureThinking:
      "featureThinking" in model.config
        ? model.config.featureThinking
        : undefined,
    featureTools:
      "featureTools" in model.config ? model.config.featureTools : undefined,
    featureVision:
      "featureVision" in model.config ? model.config.featureVision : undefined,
    fileSystemIdentifier:
      "fileSystemIdentifier" in model.config
        ? model.config.fileSystemIdentifier
        : undefined,
    ...(includeConnectionDetails && {
      provider: "provider" in model.config ? model.config.provider : undefined,
      baseUrl: "baseUrl" in model.config ? model.config.baseUrl : undefined,
      ...("region" in model.config ? { region: model.config.region } : {}),
      modelId: "modelId" in model.config ? model.config.modelId : undefined,
    }),
  };
}
export type ModelSummary = ReturnType<typeof toModelSummary>;
