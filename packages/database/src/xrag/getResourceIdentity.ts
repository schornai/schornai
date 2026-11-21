import { identifierFromTitle } from "xrag/identifier";
import { nativeResourceId } from "xrag/identity";
import type { XRAGResource } from "xrag/schema";
import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only. Caller must read and authorize the saved resource first, and pass
 * its actual workspace. Registering native identities makes re-imports conflicts
 * instead of creating a second copy of the object that was exported. */
export async function getResourceIdentity(
  kind: XRAGResource["resourceType"],
  localId: string,
  workspaceId: string,
  { supabase, name }: { supabase: SupabaseClient; name: string },
) {
  const initialId = identifierFromTitle(name);
  const register = (originId: string) =>
    supabase.from("xrag_resource_origins").upsert(
      {
        kind,
        local_id: localId,
        workspace_id: workspaceId,
        origin_id: originId,
      },
      { onConflict: "kind,local_id", ignoreDuplicates: true },
    );
  let { error } = await register(initialId);
  if (error?.code === "23505") {
    ({ error } = await register(
      `${initialId}-${nativeResourceId(kind, localId).slice(0, 8)}`,
    ));
  }
  if (error) throw new Error("XRAG_IDENTITY_FAILED");
  const result = await supabase
    .from("xrag_resource_origins")
    .select("origin_id,workspace_id")
    .eq("kind", kind)
    .eq("local_id", localId)
    .single();
  if (result.error || !result.data) throw new Error("XRAG_IDENTITY_FAILED");
  if (result.data.workspace_id !== workspaceId) {
    const moved = await supabase
      .from("xrag_resource_origins")
      .update({ workspace_id: workspaceId })
      .eq("kind", kind)
      .eq("local_id", localId)
      .eq("workspace_id", result.data.workspace_id);
    if (moved.error) throw new Error("XRAG_IDENTITY_FAILED");
  }
  return result.data.origin_id;
}
