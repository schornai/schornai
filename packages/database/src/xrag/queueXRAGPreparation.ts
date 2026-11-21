import { getXRAGImportStatus } from "./getXRAGImportStatus.ts";
import { scheduleJob } from "../scheduler/scheduleJob.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import {
  getXRAGClaims,
  getXRAGUserId,
  type XRAGOptions,
} from "./authentication.ts";
import {
  transferSourceSchema,
  XRAG_TRANSFER_BUCKET,
} from "./transferSchema.ts";

/** Queue inspection of an existing immutable upload. The stable job ID also covers retries after a lost redirect. */
export async function queueXRAGPreparation(
  input: { path: string; digest?: string },
  options: XRAGOptions,
) {
  const source = transferSourceSchema.parse(input);
  const userId = await getXRAGUserId(options);
  const claims = await getXRAGClaims(options);
  requirePlatformAccess(claims, "admin", "workspace");
  const [owner, folder] = source.path.split("/");
  const uploadId = folder!.toLowerCase();
  if (owner !== userId) throw new Error("NOT_AUTHORIZED");
  if (await getXRAGImportStatus(uploadId, options)) return { uploadId };
  const queuedAt = Date.now();
  const original = await options.supabase.storage
    .from(XRAG_TRANSFER_BUCKET)
    .info(source.path);
  if (original.error || !original.data)
    throw new Error("XRAG_TRANSFER_UNAVAILABLE");
  if (!(Date.parse(original.data.createdAt) > queuedAt - 3600_000))
    throw new Error("XRAG_TRANSFER_EXPIRED");
  await scheduleJob(
    {
      id: `xrag:prepare:${userId}/${uploadId}`,
      kind: "xrag.import.prepare",
      payload: { userId, claims, source, queuedAt },
      runAt: new Date(),
      maxAttempts: 3,
    },
    { supabase: options.supabaseServiceRole },
  );
  return { uploadId };
}
