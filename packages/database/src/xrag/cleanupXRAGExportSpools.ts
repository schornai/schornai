import { readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SupabaseClient } from "../_shared/_types.ts";
/** Worker maintenance. Only attempt-scoped resource snapshots whose lease is
 * gone are removed; never touch another worker's live working directory. */
export async function cleanupXRAGExportSpools({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const live = await supabase
    .from("xrag_export_jobs")
    .select("owner_token")
    .eq("state", "processing")
    .gt("lease_until", new Date().toISOString());
  if (live.error) throw new Error("XRAG_CLEANUP_FAILED");
  const owners = new Set(live.data.map((j) => j.owner_token));
  for (const entry of await readdir(tmpdir(), { withFileTypes: true })) {
    const match = /^xrag-export-worker-([a-f0-9-]{36})-/.exec(entry.name);
    if (!match || !entry.isDirectory() || owners.has(match[1]!)) continue;
    const path = join(tmpdir(), entry.name);
    const metadata = await stat(path);
    // Grace period also covers directories created concurrently with this scan.
    if (Date.now() - metadata.mtimeMs > 5 * 60_000)
      await rm(path, { recursive: true, force: true });
  }
}
