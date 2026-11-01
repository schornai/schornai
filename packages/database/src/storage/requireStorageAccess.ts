import type { SupabaseClient } from "../_shared/_types.ts";
import type { UserClaims } from "../auth/_types.ts";
import type { Storage } from "./_types.ts";
import { getCurrentUserClaims } from "../user/getCurrentUserClaims.ts";
import { StorageSession } from "./_utils/StorageSession.ts";

/**
 * Uses the caller's authenticated client and RLS; never a service-role client.
 * authenticatedClaims may only come from trusted server context and must match
 * the claims used to construct this client's signed token, never tool input.
 */
export async function requireStorageAccess(
  storage: Storage,
  mode: "read" | "write",
  {
    supabase,
    authenticatedClaims,
  }: { supabase: SupabaseClient; authenticatedClaims?: UserClaims },
) {
  if (
    Object.entries(storage).some(
      ([key, value]) =>
        key !== "type" &&
        (typeof value !== "string" || !/^[a-zA-Z0-9-]+$/.test(value)),
    )
  )
    throw new Error("INVALID_STORAGE");
  if (storage.type === "documentRepository") {
    const { data, error } = await supabase
      .from("databases")
      .select("organization_id")
      .eq("id", storage.documentRepositoryId)
      .maybeSingle();
    if (error || !data || data.organization_id !== storage.workspaceId)
      throw new Error("STORAGE_NOT_AUTHORIZED");
    if (mode === "write") {
      const claims =
        authenticatedClaims ??
        (await getCurrentUserClaims({
          supabaseAuth: supabase.auth,
        }));
      if (
        claims !== "admin" &&
        !claims.some(
          (claim) =>
            claim.organization_id === storage.workspaceId &&
            ["editor", "workspace-admin", "admin"].includes(claim.role),
        )
      )
        throw new Error("STORAGE_NOT_AUTHORIZED");
    }
    return;
  }
  const documentName = StorageSession.getStoragePath("", storage).storagePath;
  const { data, error } = await supabase
    .from("realtime_documents")
    .select("id")
    .eq("document_name", documentName)
    .maybeSingle();
  if (error || !data) throw new Error("STORAGE_NOT_AUTHORIZED");
}
