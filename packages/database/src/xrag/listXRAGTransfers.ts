import { z } from "zod";
import {
  getXRAGClaims,
  getXRAGUserId,
  type XRAGOptions,
} from "./authentication.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { XRAG_TRANSFER_BUCKET, transferPathSchema } from "./transferSchema.ts";

/** Read only the caller's temporary archives, including files from earlier visits. */
export async function listXRAGTransfers(
  options: Pick<XRAGOptions, "supabase" | "authenticated">,
  uploadId?: string,
) {
  requirePlatformAccess(await getXRAGClaims(options), "admin", "workspace");
  const userId = await getXRAGUserId(options);
  const bucket = options.supabase.storage.from(XRAG_TRANSFER_BUCKET);
  async function list(prefix: string) {
    const files = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await bucket.list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error || !data) throw new Error("XRAG_TRANSFER_LIST_FAILED");
      files.push(...data);
      if (data.length < 100) break;
    }
    return files;
  }
  const cutoff = Date.now() - 3600_000;
  if (uploadId !== undefined) z.uuid().parse(uploadId);
  const files = new Map<
    string,
    {
      id: string;
      path: string;
      name: string;
      createdAt: string;
      size: number | null;
    }
  >();
  const folders = uploadId
    ? [uploadId]
    : (await list(userId))
        .filter(
          (folder) => !folder.id && z.uuid().safeParse(folder.name).success,
        )
        .map((folder) => folder.name);
  for (const folder of folders) {
    for (const file of await list(userId + "/" + folder)) {
      if (!file.id || !file.created_at || Date.parse(file.created_at) <= cutoff)
        continue;
      const path = userId + "/" + folder + "/" + file.name;
      if (!transferPathSchema.safeParse(path).success) continue;
      const size = file.metadata?.size;
      files.set(path, {
        id: folder,
        path,
        name: file.name,
        createdAt: file.created_at,
        size:
          typeof size === "number" && Number.isFinite(size) && size >= 0
            ? size
            : null,
      });
    }
  }
  // Preparation publishes its inventory before removing the original object.
  // Read the inventory last so uploads stay visible across that transition.
  const preparedQuery = options.supabase
    .from("xrag_prepared_uploads")
    .select("id,source_path,name,size,created_at")
    .eq("user_id", userId)
    .gt("created_at", new Date(cutoff).toISOString());
  const prepared = await (uploadId
    ? preparedQuery.eq("id", uploadId)
    : preparedQuery);
  if (prepared.error) throw new Error("XRAG_TRANSFER_LIST_FAILED");
  for (const file of prepared.data ?? [])
    files.set(file.source_path, {
      id: file.id,
      path: file.source_path,
      name: file.name,
      size: Number(file.size),
      createdAt: file.created_at,
    });
  return [...files.values()].sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || a.path.localeCompare(b.path),
  );
}
