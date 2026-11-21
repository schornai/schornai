import { beforeEach, expect, it, vi } from "vitest";
import { cleanupXRAGExportSpools } from "../packages/database/src/xrag/cleanupXRAGExportSpools.ts";
import { query } from "./helpers/supabase.ts";
const fs = vi.hoisted(() => ({ readdir: vi.fn(), stat: vi.fn(), rm: vi.fn() }));
vi.mock("node:fs/promises", () => fs);
vi.mock("node:os", () => ({ tmpdir: () => "/private/worker-temp" }));
const owner = "11111111-1111-4111-8111-111111111111";
const orphan = "22222222-2222-4222-8222-222222222222";
const recent = "33333333-3333-4333-8333-333333333333";
beforeEach(() => vi.resetAllMocks());
it("removes only expired attempt directories, preserving live workers, new directories and symlinks", async () => {
  const directory = (name: string, isDirectory = true) => ({
    name,
    isDirectory: () => isDirectory,
  });
  fs.readdir.mockResolvedValue([
    directory(`xrag-export-worker-${owner}-live`),
    directory(`xrag-export-worker-${orphan}-old`),
    directory(`xrag-export-worker-${recent}-new`),
    directory(`xrag-export-worker-${orphan}-symlink`, false),
    directory("unrelated"),
  ]);
  fs.stat.mockImplementation(async (path: string) => ({
    mtimeMs: Date.now() - (path.endsWith("-new") ? 1000 : 3600_000),
  }));
  const q = query({ data: [{ owner_token: owner }], error: null });
  await cleanupXRAGExportSpools({ supabase: { from: () => q } as any });
  expect(q.eq).toHaveBeenCalledWith("state", "processing");
  expect(q.gt).toHaveBeenCalledWith("lease_until", expect.any(String));
  expect(fs.rm).toHaveBeenCalledTimes(1);
  expect(fs.rm).toHaveBeenCalledWith(
    `/private/worker-temp/xrag-export-worker-${orphan}-old`,
    { recursive: true, force: true },
  );
});
it("does not clean any payload if live ownership cannot be checked", async () => {
  await expect(
    cleanupXRAGExportSpools({
      supabase: { from: () => query({ error: { message: "offline" } }) } as any,
    }),
  ).rejects.toThrow("XRAG_CLEANUP_FAILED");
  expect(fs.readdir).not.toHaveBeenCalled();
  expect(fs.rm).not.toHaveBeenCalled();
});
