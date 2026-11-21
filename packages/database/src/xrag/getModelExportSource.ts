import { installedModelArchive } from "./installedModelArchive.ts";
import { nativeResourceId } from "xrag/identity";
import { identifierFromTitle } from "xrag/identifier";
import { xragSchema } from "xrag/schema";
import { getXRAGClaims, type XRAGOptions } from "./authentication.ts";
import { mapAIModel } from "../aiModel/_mappers.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { mapArtifact } from "./_mappers.ts";

type ModelExportSource = { resourceId: string; name: string; size: number } & (
  | {
      installed: Awaited<ReturnType<typeof installedModelArchive>>;
      id?: never;
      path?: never;
    }
  | { installed?: never; id: string; path: string }
);

/** Workspace administrators may export a readable model,
 * never arbitrary privileged artifacts. Import authorization remains separate. */
export async function getModelExportSource(
  modelId: string,
  { supabase, supabaseServiceRole, authenticated }: XRAGOptions,
  pinnedVersion?: string,
): Promise<ModelExportSource> {
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
  const identity = {
    resourceId: nativeResourceId("model", model.identifier),
    name: `model-${identifierFromTitle(model.name)}.xrag.tar`,
  };
  try {
    const installed = await installedModelArchive(model, row.identifier);
    if (!pinnedVersion || pinnedVersion === installed.version)
      return { ...identity, installed, size: installed.size };
  } catch (error) {
    // A core host may depend on models installed on another machine. Its
    // published archive remains exportable even without a locally readable copy.
    if (
      !["ENOENT", "ENOTDIR", "EACCES"].includes(
        (error as NodeJS.ErrnoException).code ?? "",
      )
    )
      throw error;
  }
  const publications = supabaseServiceRole
    .from("artifact_catalog")
    .select("*")
    .eq("metadata->xrag->meta->>identifier", row.identifier)
    .eq(
      "metadata->xrag->>xrag_type",
      model.type === "mlx_whisper_v1" ? "mlxWhisperModel" : "ollamaModel",
    )
    .is("deleted_at", null);
  const result = await (
    pinnedVersion
      ? publications.eq("id", pinnedVersion)
      : publications.order("created_at", { ascending: false }).limit(1)
  ).maybeSingle();
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
  return {
    path: result.data.object_path,
    id: artifact.id,
    size: artifact.size,
    ...identity,
  };
}
