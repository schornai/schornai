import { createHash } from "node:crypto";
import type { SupabaseClient } from "../_shared/_types.ts";
import type { XRAG } from "./_schema.ts";

/** Server-only: global admin publication registers a model once for the whole instance. */
export async function registerArtifactModel(
  xrag: XRAG,
  metadata: Map<string, Buffer>,
  { supabase }: { supabase: SupabaseClient },
) {
  if (xrag.xrag_type !== "mlxWhisperModel" && xrag.xrag_type !== "ollamaModel")
    return undefined;
  const { data: existing, error } = await supabase
    .from("ai_models")
    .select("type,config")
    .eq("identifier", xrag.meta.identifier)
    .maybeSingle();
  if (error) throw new Error("MODEL_READ_FAILED");
  const type =
    xrag.xrag_type === "mlxWhisperModel" ? "mlx_whisper_v1" : xrag.meta.type;
  if (existing && existing.type !== type)
    throw new Error("MODEL_TYPE_CONFLICT");
  const previous = existing?.config as { fileSystemIdentifier?: string } | null;
  // Preserve old model paths; new installs on all machines use the same identifier.
  const fileSystemIdentifier =
    previous?.fileSystemIdentifier ??
    createHash("sha256").update(xrag.meta.identifier).digest("hex");
  const config =
    xrag.xrag_type === "mlxWhisperModel"
      ? { fileSystemIdentifier }
      : {
          contextSize: xrag.meta.contextSize,
          ollamaIdentifier: `local_registry.schorn.ai/library/${xrag.modelName}:${xrag.modelTag}`,
          ...(xrag.meta.type === "ollama_llm_v1"
            ? {
                featureThinking: xrag.meta.featureThinking,
                featureTools: xrag.meta.featureTools,
                featureVision: xrag.meta.featureVision,
              }
            : { embeddingVectorSize: xrag.meta.embeddingVectorSize }),
        };
  let image: { path: string; storage: string; type: string } | undefined;
  for (const extension of ["png", "jpg", "gif", "webp"]) {
    const bytes = metadata.get(`image.${extension}`);
    if (!bytes) continue;
    const path = `xrag/${createHash("sha256").update(bytes).digest("hex")}.${extension}`;
    const { error: imageError } = await supabase.storage
      .from("model_images")
      .upload(path, bytes, {
        upsert: true,
        contentType: extension === "jpg" ? "image/jpeg" : `image/${extension}`,
      });
    if (imageError) throw new Error("MODEL_IMAGE_FAILED");
    image = { path, storage: "model_images", type: "supabase-storage-path" };
    break;
  }
  const result = await supabase.from("ai_models").upsert(
    {
      identifier: xrag.meta.identifier,
      name: xrag.meta.name,
      type,
      config,
      ...(metadata.has("description.md")
        ? { description: metadata.get("description.md")!.toString("utf8") }
        : {}),
      ...(image ? { image } : {}),
    },
    { onConflict: "identifier" },
  );
  if (result.error) throw new Error("MODEL_REGISTRATION_FAILED");
  return xrag.xrag_type === "mlxWhisperModel"
    ? fileSystemIdentifier
    : undefined;
}
