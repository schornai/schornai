import { z } from "zod";
import { xragExportJobSchema } from "./cancelXRAGExport.ts";
import { packageObjectSchema } from "./packageSchema.ts";
import {
  getXRAGClaims,
  getXRAGUserId,
  type XRAGOptions,
} from "./authentication.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { getAuthorizedResource } from "./getAuthorizedResource.ts";
import { getXRAGPackageModel } from "./getXRAGPackageModel.ts";
export async function getXRAGExportDownload(
  input: { jobId: string },
  options: XRAGOptions,
) {
  const { jobId } = xragExportJobSchema.parse(input);
  requirePlatformAccess(await getXRAGClaims(options), "admin", "workspace");
  const result = await options.supabaseServiceRole
    .from("xrag_export_jobs")
    .select("name,object_path,selections,updated_at")
    .eq("id", jobId)
    .eq("user_id", await getXRAGUserId(options))
    .eq("state", "finished")
    .single();
  if (
    result.error ||
    !result.data?.object_path ||
    Date.now() - Date.parse(result.data.updated_at) >= 72 * 3600_000
  )
    throw new Error("XRAG_EXPORT_FAILED");
  for (const selection of z
    .array(packageObjectSchema.strip())
    .parse(result.data.selections)) {
    if (selection.kind === "model")
      await getXRAGPackageModel(selection.id, options);
    else await getAuthorizedResource(selection.kind, selection.id, options);
  }
  const { data, error } = await options.supabaseServiceRole.storage
    .from("xrag-exports")
    .createSignedUrl(result.data.object_path, 600, {
      download: result.data.name,
    });
  if (error || !data) throw new Error("XRAG_EXPORT_FAILED");
  return { name: result.data.name, url: data.signedUrl };
}
