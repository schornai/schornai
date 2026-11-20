import { importedResourceId } from "xrag/identity";
import type { XRAGResource } from "xrag/schema";
import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only; caller must authorize the target workspace before using this lookup. */
export async function resolveResourceIdentity(
  kind: XRAGResource["resourceType"],
  originId: string,
  workspaceId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data, error } = await supabase
    .from("xrag_resource_origins")
    .select("local_id")
    .eq("workspace_id", workspaceId)
    .eq("kind", kind)
    .eq("origin_id", originId)
    .maybeSingle();
  if (error) throw new Error("XRAG_IDENTITY_FAILED");
  const localId =
    data?.local_id ?? importedResourceId(workspaceId, kind, originId);
  if (kind === "agent" || kind === "automation")
    return { localId, identifier: localId };
  const saved = await supabase
    .from(kind === "transcriber" ? "transcribers" : "databases")
    .select("config")
    .eq("id", localId)
    .eq("organization_id", workspaceId)
    .maybeSingle();
  if (saved.error) throw new Error("XRAG_IDENTITY_FAILED");
  const config = saved.data?.config;
  const identifier =
    config &&
    typeof config === "object" &&
    !Array.isArray(config) &&
    typeof config.identifier === "string" &&
    config.identifier
      ? config.identifier
      : localId;
  return { localId, identifier };
}
