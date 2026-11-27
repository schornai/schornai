import type { SupabaseClient } from "../_shared/_types.ts";
import { mapTranscriber } from "./_mappers.ts";

export type TranscriberConfigurationIssue =
  | "TRANSCRIBER_REQUIRED"
  | "TRANSCRIBER_NOT_FOUND"
  | "TRANSCRIBER_MODEL_MISSING";

export class TranscriberConfigurationError extends Error {
  readonly code: TranscriberConfigurationIssue;

  constructor(code: TranscriberConfigurationIssue) {
    super(code);
    this.code = code;
  }
}

export async function requireTranscriber(
  identifier: string | undefined,
  { supabase }: { supabase: SupabaseClient },
) {
  if (!identifier)
    throw new TranscriberConfigurationError("TRANSCRIBER_REQUIRED");
  const find = (column: "config->>identifier" | "id") =>
    supabase
      .from("transcribers")
      .select()
      .eq(column, identifier)
      .order("name")
      .limit(1)
      .maybeSingle()
      .throwOnError();
  // Older transcribers use their row ID as their identifier.
  const row =
    (await find("config->>identifier")).data ?? (await find("id")).data;
  if (!row) throw new TranscriberConfigurationError("TRANSCRIBER_NOT_FOUND");
  const transcriber = mapTranscriber({ ...row, config: row.config ?? {} });
  const transcriberIdentifier = row.ai_model_id
    ? row.id
    : transcriber.identifier;
  if (transcriberIdentifier !== identifier)
    throw new TranscriberConfigurationError("TRANSCRIBER_NOT_FOUND");

  // Resolve legacy model IDs without migrating configuration on a chat page read.
  const modelReference = row.ai_model_id || transcriber.modelIdentifier;
  if (modelReference) {
    const { data } = await supabase
      .from("ai_models")
      .select("identifier")
      .eq(row.ai_model_id ? "id" : "identifier", modelReference)
      .eq("type", "mlx_whisper_v1")
      .maybeSingle()
      .throwOnError();
    if (data)
      return { ...transcriber, identifier, modelIdentifier: data.identifier };
  }
  throw new TranscriberConfigurationError("TRANSCRIBER_MODEL_MISSING");
}
