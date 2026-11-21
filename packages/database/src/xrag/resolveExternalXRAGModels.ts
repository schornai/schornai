import { getAIModels } from "../aiModel/getAIModels.ts";
import { nativeResourceId } from "xrag/identity";
import { getXRAGClaims, type XRAGOptions } from "./authentication.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { parseResource } from "./resource.ts";

/** Read only public model metadata through the caller's RLS client. Never read,
 * export or change credentials. Confirmed choices are rechecked at import. */
export async function resolveExternalXRAGModels(
  resources: readonly unknown[],
  options: Pick<XRAGOptions, "supabase" | "authenticated">,
  selections: Readonly<Record<string, string>> = {},
  requireResolved = false,
) {
  requirePlatformAccess(await getXRAGClaims(options), "admin", "workspace");
  const references = new Map<
    string,
    { provider: string; modelId: string } | undefined
  >();
  for (const resource of resources.map(parseResource)) {
    for (const ref of resource.archive.references) {
      if (ref.externalModel && ref.kind !== "model")
        throw new Error("XRAG_INVALID_REFERENCES");
      if (
        ref.kind !== "model" ||
        (!ref.externalModel && !ref.identifier.startsWith("external:"))
      )
        continue;
      if (
        references.has(ref.identifier) &&
        JSON.stringify(references.get(ref.identifier)) !==
          JSON.stringify(ref.externalModel)
      )
        throw new Error("XRAG_INVALID_REFERENCES");
      references.set(ref.identifier, ref.externalModel);
    }
  }
  const models = references.size ? await getAIModels(options) : [];
  const mappings: Record<string, string> = Object.create(null);
  const choices = [...references].map(([sourceIdentifier, descriptor]) => {
    const candidates = models
      .filter(
        (model) =>
          model.type === "external_llm_v1" &&
          (descriptor
            ? model.config.provider === descriptor.provider &&
              model.config.modelId === descriptor.modelId
            : model.identifier === sourceIdentifier),
      )
      .map(({ identifier, name }) => ({ identifier, name }));
    const selected = selections[sourceIdentifier];
    if (selected && !candidates.some((model) => model.identifier === selected))
      throw new Error("XRAG_MODEL_SELECTION_INVALID");
    const resolved =
      selected ??
      (candidates.length === 1 ? candidates[0]!.identifier : undefined);
    if (resolved) mappings[sourceIdentifier] = resolved;
    else if (!candidates.length)
      mappings[sourceIdentifier] =
        `external:missing:${nativeResourceId("model", sourceIdentifier)}`;
    if (requireResolved && candidates.length > 1 && !resolved)
      throw new Error("XRAG_MODEL_SELECTION_REQUIRED");
    return {
      sourceIdentifier,
      provider: descriptor?.provider ?? null,
      modelId: descriptor?.modelId ?? sourceIdentifier,
      candidates,
      selectedIdentifier: resolved ?? null,
    };
  });
  if (Object.keys(selections).some((key) => !references.has(key)))
    throw new Error("XRAG_MODEL_SELECTION_INVALID");
  return { mappings, choices };
}
