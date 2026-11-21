import { createReadStream } from "node:fs";
import { inspectArchive } from "xrag/archive";
import { getAIModels } from "../aiModel/getAIModels.ts";
import type { XRAGOptions } from "./authentication.ts";

/** Resolve local model archives for includeModels exports. Connections to an
 * external provider travel as references in the resource itself. */
export async function getReferencedXRAGModelIds(
  resourceFile: string,
  options: Pick<XRAGOptions, "supabase" | "signal">,
) {
  const { xrag } = await inspectArchive(
    createReadStream(resourceFile),
    options.signal,
  );
  if (xrag.xrag_type !== "resource") throw new Error("XRAG_INVALID_RESOURCE");
  const references = xrag.references.filter(
    (ref) =>
      ref.kind === "model" &&
      !ref.externalModel &&
      !ref.identifier.startsWith("external:"),
  );
  if (!references.length) return [];
  const models = await getAIModels(options);
  const ids = new Set<string>();
  for (const reference of references) {
    const model = models.find(
      (model) => model.identifier === reference.identifier,
    );
    if (!model) throw new Error("XRAG_MODEL_ARCHIVE_UNAVAILABLE");
    if (model.type !== "external_llm_v1") ids.add(model.id);
  }
  return [...ids];
}
