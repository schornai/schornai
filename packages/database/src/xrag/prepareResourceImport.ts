import { nextAutomationTime } from "../automation/nextAutomationTime.ts";
import type { Json } from "../_shared/_supabase.ts";
import {
  getXRAGUserId,
  getXRAGClaims,
  type XRAGOptions,
} from "./authentication.ts";
import { requireImportAccess } from "./requireImportAccess.ts";
import { parseResource } from "./resource.ts";
import { resolveResourceIdentity } from "./resolveResourceIdentity.ts";

/** Rebuild from validated immutable archives for both preview and confirmation;
 * never trust a caller-supplied database plan. Does not write any rows or files. */
export async function prepareResourceImport(
  resources: readonly unknown[],
  target: { workspaceId: string; newWorkspaceName?: string },
  { supabase, supabaseServiceRole, authenticated }: XRAGOptions,
  externalModels: Readonly<Record<string, string>> = {},
) {
  const claims = await getXRAGClaims({ supabase, authenticated });
  requireImportAccess(
    resources,
    target.newWorkspaceName === undefined
      ? { workspaceId: target.workspaceId }
      : { newWorkspace: true },
    claims,
  );
  const parsed = resources.map(parseResource);
  if (new Set(parsed.map(({ archive }) => archive.id)).size !== parsed.length)
    throw new Error("XRAG_DUPLICATE_RESOURCE");
  const entries = [];
  for (const { archive, resource } of parsed) {
    const resolve = (kind: typeof archive.resourceType, origin: string) =>
      resolveResourceIdentity(kind, origin, target.workspaceId, {
        supabase: supabaseServiceRole,
      });
    const references = new Map<string, string>();
    for (const ref of archive.references) {
      references.set(
        `${ref.kind}:${ref.identifier}`,
        ref.kind === "model"
          ? (externalModels[ref.identifier] ?? ref.identifier)
          : (await resolve(ref.kind, ref.id)).identifier,
      );
    }
    const reference = (
      kind: "model" | "agent" | "documentRepository" | "transcriber",
      identifier?: string,
    ) => {
      if (!identifier) return identifier;
      const result = references.get(`${kind}:${identifier}`);
      if (!result) throw new Error("XRAG_INVALID_REFERENCES");
      return result;
    };
    const { localId, identifier } = await resolve(
      archive.resourceType,
      archive.id,
    );
    const revision = await supabaseServiceRole.rpc("xrag_resource_revision", {
      p_kind: archive.resourceType,
      p_id: localId,
      p_workspace_id: target.workspaceId,
    });
    if (revision.error) throw new Error("XRAG_IMPORT_PREVIEW_FAILED");
    let config: Record<string, unknown>;
    let prompt: string | undefined;
    switch (resource.kind) {
      case "automation": {
        const data = resource.data;
        data.agentId = reference("agent", data.agentId)!;
        if (
          data.trigger.type === "storage" &&
          data.trigger.storage.type === "documentRepository"
        ) {
          const repositoryId = data.trigger.storage.documentRepositoryId;
          const ref = archive.references.find(
            (ref) =>
              ref.kind === "documentRepository" &&
              ref.identifier === repositoryId,
          )!;
          data.trigger.storage = {
            type: "documentRepository",
            documentRepositoryId: (await resolve("documentRepository", ref.id))
              .localId,
            workspaceId: target.workspaceId,
          };
        }
        const nextRunAt =
          data.enabled && data.trigger.type === "time"
            ? (nextAutomationTime(
                data.trigger.schedule,
                new Date(),
              )?.toISOString() ?? null)
            : null;
        if (data.enabled && data.trigger.type === "time" && !nextRunAt)
          throw new Error("AUTOMATION_DATE_PAST");
        config = {
          ...data,
          nextRunAt,
          accessLevel: claims === "admin" ? "admin" : "workspace",
          userId: await getXRAGUserId({ supabase, authenticated }),
        };
        break;
      }
      case "agent": {
        const {
          name: _name,
          description: _description,
          ...data
        } = resource.data;
        data.modelIdentifier = reference("model", data.modelIdentifier)!;
        data.transcriberIdentifier = reference(
          "transcriber",
          data.transcriberIdentifier,
        );
        for (const role of data.roles) {
          role.modelIdentifierOverride = reference(
            "model",
            role.modelIdentifierOverride,
          );
          for (const mount of role.documentRepositoryMounts)
            mount.documentRepositoryIdentifier = reference(
              "documentRepository",
              mount.documentRepositoryIdentifier,
            )!;
        }
        config = data;
        break;
      }
      case "transcriber": {
        const {
          name: _name,
          description: _description,
          prompt: exportedPrompt,
          ...data
        } = resource.data;
        prompt = exportedPrompt;
        data.modelIdentifier = reference("model", data.modelIdentifier);
        config = { ...data, identifier };
        break;
      }
      case "documentRepository": {
        const {
          name: _name,
          description: _description,
          ...data
        } = resource.data;
        data.transcriberIdentifier = reference(
          "transcriber",
          data.transcriberIdentifier,
        );
        if (data.index?.embedding)
          data.index.embedding.modelIdentifier = reference(
            "model",
            data.index.embedding.modelIdentifier,
          );
        config = { ...data, identifier };
        break;
      }
    }
    entries.push({
      kind: archive.resourceType,
      originId: archive.id,
      localId,
      name: resource.data.name,
      description: resource.data.description ?? "",
      ...(prompt !== undefined ? { prompt } : {}),
      config: JSON.parse(JSON.stringify(config)) as Json,
      expectedRevision: revision.data ?? null,
    });
  }
  return entries;
}
