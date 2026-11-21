import { safeSegment } from "./schema.ts";

/** Resolve Ollama's short names and explicit registry/namespace/name:tag to its
 * on-disk manifest. Only validated path components leave this function. */
export function ollamaModelLocation(identifier: string) {
  const parts = identifier.split("/");
  const last = parts.pop()!;
  const [name, tag = "latest", extra] = last.split(":");
  if (
    extra !== undefined ||
    !safeSegment.safeParse(name).success ||
    !safeSegment.safeParse(tag).success
  )
    throw new Error("XRAG_INVALID_MODEL");
  const explicitRegistry =
    parts.length > 0 && (/[.:]/.test(parts[0]!) || parts[0] === "localhost");
  const registry = explicitRegistry ? parts.shift()! : "registry.ollama.ai";
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]*(?::[0-9]{1,5})?$/.test(registry) ||
    !parts.every((segment) => safeSegment.safeParse(segment).success)
  )
    throw new Error("XRAG_INVALID_MODEL");
  const namespace = parts.length ? parts : ["library"];
  return {
    modelName: [
      ...namespace.filter((value, i) => i !== 0 || value !== "library"),
      name!,
    ].join("/"),
    modelTag: tag,
    manifest: ["manifests", registry, ...namespace, name!, tag],
  };
}

export function importedOllamaLocation(model: {
  modelName: string;
  modelTag: string;
  ollamaIdentifier?: string;
}) {
  const identifier =
    model.ollamaIdentifier ??
    `local_registry.schorn.ai/library/${model.modelName}:${model.modelTag}`;
  const location = ollamaModelLocation(identifier);
  if (
    location.modelName !== model.modelName ||
    location.modelTag !== model.modelTag
  )
    throw new Error("XRAG_INVALID_MODEL");
  return { identifier, manifest: location.manifest };
}
