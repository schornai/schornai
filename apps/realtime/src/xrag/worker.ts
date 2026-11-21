import { cleanupXRAGExportSpools } from "@schornio/aibox-database/xrag/cleanupXRAGExportSpools";
import { setTimeout as delay } from "node:timers/promises";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import { processXRAGExport } from "@schornio/aibox-database/xrag/processXRAGExport";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";

export async function xragExportWorker({
  supabase,
  signal,
}: {
  supabase: SupabaseClient;
  signal: AbortSignal;
}) {
  const endpoint = `${getEnvSafe("SUPABASE_URL").replace(/\/$/, "")}/storage/v1/upload/resumable`;
  const token = getEnvSafe("SUPABASE_SERVICE_ROLE_KEY");
  let lastCleanup = 0;
  while (!signal.aborted) {
    try {
      if (Date.now() - lastCleanup > 60_000) {
        await cleanupXRAGExportSpools({ supabase });
        lastCleanup = Date.now();
      }
      if (
        (await processXRAGExport({ supabase, signal, endpoint, token })).worked
      )
        continue;
    } catch {
      if (!signal.aborted) console.error("XRAG export worker will retry");
    }
    await delay(2000, undefined, { signal }).catch(() => {});
  }
}
