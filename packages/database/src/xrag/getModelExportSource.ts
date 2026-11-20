import { nativeResourceId } from "xrag/identity";
import { identifierFromTitle } from "xrag/identifier";
import { xragSchema } from "xrag/schema";
import { getXRAGClaims, type XRAGOptions } from "./authentication.ts";
import { mapAIModel } from "../aiModel/_mappers.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { mapArtifact } from "./_mappers.ts";

/** Workspace administrators may export a readable model's original archive,
 * never arbitrary privileged artifacts. Import authorization remains separate. */
export async function getModelExportSource(
  modelId: string,
  { supabase, supabaseServiceRole, authenticated }: XRAGOptions,
) {
  const claims = await getXRAGClaims({ supabase, authenticated });
  requirePlatformAccess(claims, "admin", "workspace");
  const { data: row } = await supabase
    .from("ai_models")
    .select()
    .eq("id", modelId)
    .single()
    .throwOnError();
  const model = mapAIModel(row);
  if (model.type === "external_llm_v1")
    throw new Error("XRAG_MODEL_ARCHIVE_UNAVAILABLE");
  const result = await supabaseServiceRole
    .from("artifact_catalog")
    .select("*")
    .eq("metadata->xrag->meta->>identifier", row.identifier)
    .in("metadata->xrag->>xrag_type", ["ollamaModel", "mlxWhisperModel"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error || !result.data)
    throw new Error("XRAG_MODEL_ARCHIVE_UNAVAILABLE");
  const artifact = mapArtifact(result.data);
  const metadata = xragSchema.parse(artifact.xrag);
  if (
    (metadata.xrag_type !== "ollamaModel" &&
      metadata.xrag_type !== "mlxWhisperModel") ||
    metadata.meta.identifier !== row.identifier ||
    (model.type === "mlx_whisper_v1") !==
      (metadata.xrag_type === "mlxWhisperModel")
  )
    throw new Error("XRAG_MODEL_ARCHIVE_UNAVAILABLE");
  const resourceId = nativeResourceId("model", model.identifier);
  return {
    path: result.data.object_path,
    id: artifact.id,
    size: artifact.size,
    resourceId,
    name: `model-${identifierFromTitle(model.name)}.xrag.tar`,
  };
}
