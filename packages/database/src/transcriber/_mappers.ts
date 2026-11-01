import type {
  TranscriberConfig,
  TranscriberDatabaseRow,
  Transcriber_new,
} from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { getAIModelById } from "../aiModel/getAIModelById.ts";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";
import { updateTranscriberLegacyAIModelId } from "./updateTranscriberLegacyAIModelId.ts";

export function mapTranscriber(
  dbTranscriber: TranscriberDatabaseRow,
): Transcriber_new {
  const config = dbTranscriber.config as TranscriberConfig;
  return {
    color: config.color,
    description: dbTranscriber.description ?? undefined,
    icon: config.icon,
    id: dbTranscriber.id,
    identifier: config.identifier ?? dbTranscriber.id,
    modelIdentifier: config.modelIdentifier,
    name: dbTranscriber.name ?? "",
    prompt: dbTranscriber.prompt ?? undefined,
    retryLevel: config.retryLevel,
    version: "transcriber-v2",
    workspaceId: dbTranscriber.organization_id,
  };
}

export async function mapTranscriberWithLegacySupport(
  dbTranscriber: TranscriberDatabaseRow,
  { supabase }: { supabase: SupabaseClient },
): Promise<Transcriber_new> {
  const legacyModelId = dbTranscriber.ai_model_id;

  if (legacyModelId) {
    const { data: model } = await tryAsync(() =>
      getAIModelById(legacyModelId, { supabase }),
    );

    const config = dbTranscriber.config as TranscriberConfig;
    const newConfig = {
      ...config,
      identifier: dbTranscriber.id,
      modelIdentifier: model?.identifier,
    };

    await updateTranscriberLegacyAIModelId(dbTranscriber.id, newConfig, {
      supabase,
    });

    return mapTranscriber({
      ...dbTranscriber,
      config: newConfig,
    });
  } else {
    return mapTranscriber(dbTranscriber);
  }
}
