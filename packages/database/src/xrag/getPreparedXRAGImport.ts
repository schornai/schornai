import { z } from "zod";
import {
  getXRAGClaims,
  getXRAGUserId,
  type XRAGOptions,
} from "./authentication.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { requireXRAGArchiveAccess } from "./requireImportAccess.ts";
import { preparedEntriesSchema } from "./preparedUpload.ts";
import { describeXRAGImport } from "./describeXRAGImport.ts";

/** Read an already prepared selection with the caller's client, including on reload. */
export async function getPreparedXRAGImport(
  uploadId: string,
  options: Pick<XRAGOptions, "supabase" | "authenticated">,
) {
  const claims = await getXRAGClaims(options);
  requirePlatformAccess(claims, "admin", "workspace");
  const { data, error } = await options.supabase
    .from("xrag_prepared_uploads")
    .select("source_path,name,digest,entries")
    .eq("id", z.uuid().parse(uploadId))
    .eq("user_id", await getXRAGUserId(options))
    .gt("created_at", new Date(Date.now() - 3600_000).toISOString())
    .maybeSingle();
  if (error) throw new Error("XRAG_TRANSFER_UNAVAILABLE");
  if (!data) return null;
  const entries = preparedEntriesSchema.parse(data.entries);
  requireXRAGArchiveAccess(
    entries.map((entry) => entry.xrag),
    claims,
  );
  return {
    ...describeXRAGImport(entries, data.digest),
    source: { path: data.source_path, name: data.name },
  };
}
