import type { SupabaseFileObject } from "../../_shared/_types.ts";
import type { StorageSession } from "./StorageSession.ts";

export async function listStorageRows(
  path: string,
  session: StorageSession,
  search?: string,
) {
  const rows: SupabaseFileObject[] = [];
  for (let offset = 0; ; offset += 1000) {
    session.abortSignal.throwIfAborted();
    const { data, error } = await session.supabaseStorage.list(
      path,
      { limit: 1000, offset, search, sortBy: { column: "name", order: "asc" } },
      { signal: session.abortSignal },
    );
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
