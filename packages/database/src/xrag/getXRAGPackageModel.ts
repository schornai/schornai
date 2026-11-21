import { getAIModelById } from "../aiModel/getAIModelById.ts";
import type { XRAGOptions } from "./authentication.ts";

/** Resolve a caller-readable local model for selection. The export resolves its installed files or published archive. */
export async function getXRAGPackageModel(
  id: string,
  options: Pick<XRAGOptions, "supabase">,
) {
  const model = await getAIModelById(id, options);
  if (model.type === "external_llm_v1")
    throw new Error("XRAG_MODEL_ARCHIVE_UNAVAILABLE");
  return model;
}
