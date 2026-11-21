import { z } from "zod";
import type { SupabaseClient } from "../_shared/_types.ts";

const statusSchema = z
  .enum([
    "inspecting",
    "inspection_failed",
    "ready",
    "preparing",
    "applying",
    "rolling_back",
    "committed",
    "rolled_back",
  ])
  .nullable();
export type XRAGImportStatus = z.infer<typeof statusSchema>;

/** The RPC checks the caller's workspace role and returns only their own upload's state. */
export async function getXRAGImportStatus(
  uploadId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase.rpc("get_xrag_import_status", {
    p_upload_id: z.uuid().parse(uploadId),
  });
  if (error) throw new Error("XRAG_IMPORT_STATE_UNAVAILABLE");
  return statusSchema.parse(data);
}
