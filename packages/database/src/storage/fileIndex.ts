import type { SupabaseClient } from "../_shared/_types.ts";
import type { StorageSession } from "./_utils/StorageSession.ts";

export async function removeFileIndex(
  path: string,
  session: StorageSession,
  supabase: SupabaseClient,
) {
  if (session.storage.type !== "documentRepository") return;
  await supabase
    .from("sources")
    .delete()
    .eq("database_id", session.storage.documentRepositoryId)
    .eq(
      "url",
      `${session.storageName}/${session.getStoragePath(path).storagePath}`,
    )
    .throwOnError();
}

export async function renameFileIndex(
  from: string,
  to: string,
  session: StorageSession,
  supabase: SupabaseClient,
) {
  if (session.storage.type !== "documentRepository") return;
  await supabase
    .from("sources")
    .update({
      name: to.split("/").at(-1)!,
      url: `${session.storageName}/${session.getStoragePath(to).storagePath}`,
    })
    .eq("database_id", session.storage.documentRepositoryId)
    .eq(
      "url",
      `${session.storageName}/${session.getStoragePath(from).storagePath}`,
    )
    .throwOnError();
}
