import { beforeEach, expect, it, vi } from "vitest";
import { query } from "./helpers/supabase.ts";
import { recoverXRAGImports } from "../packages/database/src/xrag/recoverXRAGImports.ts";
const recovery = vi.hoisted(() => vi.fn());
vi.mock("../packages/database/src/xrag/recoverXRAGImport.ts", () => ({
  recoverXRAGImport: recovery,
}));
beforeEach(() => recovery.mockReset());
it("recovers pending work and prunes only after successful cleanup", async () => {
  const q = query({ data: [{ id: "one" }, { id: "two" }] });
  const supabase = {
    from: () => q,
    rpc: vi.fn(async () => ({ error: null })),
  } as any;
  await recoverXRAGImports({ supabase });
  expect(recovery).toHaveBeenCalledTimes(2);
  expect(supabase.rpc).toHaveBeenCalledWith("prune_xrag_import_transactions");
  recovery.mockRejectedValueOnce(new Error("offline"));
  await expect(recoverXRAGImports({ supabase })).rejects.toThrow(
    "RECOVERY_FAILED",
  );
  expect(recovery).toHaveBeenCalledTimes(4);
});
it("sanitizes listing/pruning failures and honors cancellation", async () => {
  const supabase = {
    from: vi.fn(() => query({ error: new Error("private") })),
    rpc: vi.fn(async () => ({ error: new Error("private") })),
  } as any;
  await expect(recoverXRAGImports({ supabase })).rejects.toThrow(
    "RECOVERY_FAILED",
  );
  supabase.from.mockReturnValue(query({ data: [] }));
  await expect(recoverXRAGImports({ supabase })).rejects.toThrow(
    "CLEANUP_FAILED",
  );
  supabase.from.mockReturnValue(query({ data: [{ id: "one" }] }));
  await expect(
    recoverXRAGImports({
      supabase,
      signal: AbortSignal.abort(new Error("cancelled")),
    }),
  ).rejects.toThrow("cancelled");
});
