import { getAgents } from "../agent/getAgents.ts";
import { getAIModels } from "../aiModel/getAIModels.ts";
import { getXRAGPackageModel } from "./getXRAGPackageModel.ts";
import { getDocumentRepositories } from "../documentRepositories/getDocumentRepositories.ts";
import { getTranscribers } from "../transcriber/getTranscribers.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { getXRAGClaims, type XRAGOptions } from "./authentication.ts";
import {
  packageObjectSchema,
  type XRAGPackageObject,
} from "./packageSchema.ts";
import { getAuthorizedResource } from "./getAuthorizedResource.ts";
import { parseResourceData, resourceDependencies } from "./resource.ts";

/** Read-only dependency choices, including transitive references. Every returned
 * resource must be exportable by this caller. Model archives are checked at export. */
export async function getXRAGRelatedObjects(
  selection: Pick<XRAGPackageObject, "kind" | "id">,
  options: Pick<XRAGOptions, "supabase" | "authenticated">,
): Promise<XRAGPackageObject[]> {
  const input = packageObjectSchema.parse(selection);
  const claims = await getXRAGClaims(options);
  requirePlatformAccess(claims, "admin", "workspace");
  if (input.kind === "model") {
    await getXRAGPackageModel(input.id, options);
    return [];
  }
  const root = await getAuthorizedResource(input.kind, input.id, options);
  const queue = [parseResourceData(input.kind, root)];
  const seen = new Set([`${input.kind}:${input.id}`]);
  const related: XRAGPackageObject[] = [];
  let agents: ReturnType<typeof getAgents> | undefined;
  let models: ReturnType<typeof getAIModels> | undefined;
  let repositories: ReturnType<typeof getDocumentRepositories> | undefined;
  let transcribers: ReturnType<typeof getTranscribers> | undefined;
  for (let index = 0; index < queue.length; index++) {
    for (const reference of resourceDependencies(queue[index]!)) {
      if (reference.kind === "model") {
        models ??= getAIModels(options);
        const found = (await models).find(
          (model) => model.identifier === reference.identifier,
        );
        if (!found || found.type === "external_llm_v1") continue;
        const key = `model:${found.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          related.push({ kind: "model", id: found.id, name: found.name });
        }
      } else {
        const candidates =
          reference.kind === "agent"
            ? await (agents ??= getAgents(options))
            : reference.kind === "documentRepository"
              ? await (repositories ??= getDocumentRepositories(options))
              : await (transcribers ??= getTranscribers(options));
        const found = candidates.find(
          (object) =>
            object.id === reference.identifier ||
            ("identifier" in object &&
              object.identifier === reference.identifier),
        );
        if (!found || seen.has(`${reference.kind}:${found.id}`)) continue;
        // Read access alone does not authorize exporting the configuration/files.
        try {
          requirePlatformAccess(
            claims,
            "admin",
            "workspace",
            found.workspaceId,
          );
        } catch {
          continue;
        }
        seen.add(`${reference.kind}:${found.id}`);
        related.push({ kind: reference.kind, id: found.id, name: found.name });
        queue.push(parseResourceData(reference.kind, found));
      }
      if (seen.size > 1000) throw new Error("XRAG_PACKAGE_SIZE");
    }
  }
  return related.sort(
    (a, b) =>
      a.kind.localeCompare(b.kind) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  );
}
