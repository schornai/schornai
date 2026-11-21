import { getAgents } from "../agent/getAgents.ts";
import { getAIModels } from "../aiModel/getAIModels.ts";
import type { XRAGResource } from "xrag/schema";
import { nativeResourceId } from "xrag/identity";
import type { XRAGOptions } from "./authentication.ts";
import { getAuthorizedResource } from "./getAuthorizedResource.ts";
import { getTranscribers } from "../transcriber/getTranscribers.ts";
import { getDocumentRepositories } from "../documentRepositories/getDocumentRepositories.ts";
import { getRepositoryExportFiles } from "./getRepositoryExportFiles.ts";
import { getResourceIdentity } from "./getResourceIdentity.ts";
import {
  parseResourceData,
  resourceDependencies,
  serializeResource,
} from "./resource.ts";

/** Authorizes the object using the current user's client before privileged
 * identity bookkeeping. Referenced configurations are not included implicitly. */
export async function getResourceExport(
  kind: XRAGResource["resourceType"],
  id: string,
  options: XRAGOptions,
) {
  const { supabase, supabaseServiceRole, authenticated } = options;
  const object = await getAuthorizedResource(kind, id, {
    supabase,
    authenticated,
  });
  const parsed = parseResourceData(kind, object);
  const dependencies = resourceDependencies(parsed);
  const repositories = dependencies.some(
    (ref) => ref.kind === "documentRepository",
  )
    ? await getDocumentRepositories({ supabase })
    : [];
  const transcribers = dependencies.some((ref) => ref.kind === "transcriber")
    ? await getTranscribers({ supabase })
    : [];
  const externalModels = dependencies.some(
    (ref) => ref.kind === "model" && ref.identifier.startsWith("external:"),
  )
    ? await getAIModels({ supabase })
    : [];
  const agents = dependencies.some((ref) => ref.kind === "agent")
    ? await getAgents({ supabase })
    : [];
  const references: XRAGResource["references"] = [];
  for (const reference of dependencies) {
    if (reference.kind === "model") {
      const model = externalModels.find(
        (model) => model.identifier === reference.identifier,
      );
      if (
        reference.identifier.startsWith("external:") &&
        model?.type !== "external_llm_v1"
      )
        throw new Error("XRAG_REFERENCE_UNAVAILABLE");
      references.push({
        ...reference,
        id: nativeResourceId("model", reference.identifier),
        ...(model?.type === "external_llm_v1"
          ? {
              externalModel: {
                provider: model.config.provider,
                modelId: model.config.modelId,
              },
            }
          : {}),
      });
      continue;
    }
    const found = (
      reference.kind === "agent"
        ? agents
        : reference.kind === "documentRepository"
          ? repositories
          : transcribers
    ).find(
      (candidate) =>
        candidate.id === reference.identifier ||
        ("identifier" in candidate &&
          candidate.identifier === reference.identifier),
    );
    if (!found) {
      // A partial import or deletion can leave a reference without a visible
      // target. Export only its identity, scoped to the authorized workspace.
      const origin = await supabaseServiceRole
        .from("xrag_resource_origins")
        .select("origin_id")
        .eq("workspace_id", object.workspaceId)
        .eq("kind", reference.kind)
        .eq("local_id", reference.identifier)
        .maybeSingle();
      if (origin.error) throw new Error("XRAG_IDENTITY_FAILED");
      references.push({
        ...reference,
        id:
          origin.data?.origin_id ??
          nativeResourceId(reference.kind, reference.identifier),
      });
      continue;
    }
    references.push({
      ...reference,
      id: await getResourceIdentity(
        reference.kind,
        found.id,
        found.workspaceId,
        { supabase: supabaseServiceRole, name: found.name },
      ),
    });
  }
  const origin = await getResourceIdentity(
    kind,
    object.id,
    object.workspaceId,
    { supabase: supabaseServiceRole, name: object.name },
  );
  return {
    resource: serializeResource(kind, object, origin, references),
    workspaceId: object.workspaceId,
    files:
      kind === "documentRepository"
        ? getRepositoryExportFiles(id, object.workspaceId, options)
        : [],
  };
}
