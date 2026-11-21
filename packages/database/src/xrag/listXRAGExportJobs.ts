import {
  getXRAGClaims,
  getXRAGUserId,
  type XRAGOptions,
} from "./authentication.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
export async function listXRAGExportJobs(
  options: Pick<XRAGOptions, "supabase" | "authenticated">,
) {
  requirePlatformAccess(await getXRAGClaims(options), "admin", "workspace");
  const result = await options.supabase
    .from("xrag_export_jobs")
    .select(
      "id,package_id,name,state,attempts,bytes_uploaded,total_bytes,created_at,updated_at",
    )
    .eq("user_id", await getXRAGUserId(options))
    .gte("updated_at", new Date(Date.now() - 72 * 3600_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(100);
  if (result.error) throw new Error("XRAG_EXPORT_FAILED");
  return result.data;
}
