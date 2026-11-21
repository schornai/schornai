import { z } from "zod";
import {
  getXRAGClaims,
  getXRAGUserId,
  type XRAGOptions,
} from "./authentication.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
export const xragExportJobSchema = z.object({ jobId: z.uuid() });
export async function cancelXRAGExport(
  input: { jobId: string },
  options: XRAGOptions,
) {
  const { jobId } = xragExportJobSchema.parse(input);
  requirePlatformAccess(await getXRAGClaims(options), "admin", "workspace");
  const result = await options.supabaseServiceRole
    .from("xrag_export_jobs")
    .update({
      state: "cancelled",
      owner_token: null,
      lease_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", await getXRAGUserId(options))
    .in("state", ["queued", "processing"])
    .select("id")
    .maybeSingle();
  if (result.error || !result.data) throw new Error("XRAG_EXPORT_FAILED");
}
