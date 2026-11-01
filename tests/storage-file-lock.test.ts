import { afterEach, expect, it, vi } from "vitest";
import { withStorageFileLock } from "../packages/database/src/storage/withStorageFileLock";
const storage = {
  type: "activity",
  activityId: "activity",
  agentId: "agent",
} as const;
afterEach(() => vi.useRealTimers());
function client(responses: any[]) {
  return {
    rpc: vi.fn(() => ({
      abortSignal: vi.fn(
        async () => responses.shift() ?? { data: true, error: null },
      ),
    })),
  } as any;
}
it("does not process a file when another worker owns its lease", async () => {
  const supabase = client([{ data: false, error: null }]);
  const operation = vi.fn();
  await expect(
    withStorageFileLock(
      storage,
      "file.txt",
      supabase,
      new AbortController().signal,
      operation,
    ),
  ).rejects.toThrow("FILE_PROCESSING_IN_PROGRESS");
  expect(operation).not.toHaveBeenCalled();
});
it("releases the same lease even after processing fails", async () => {
  const supabase = client([{ data: true, error: null }]);
  await expect(
    withStorageFileLock(
      storage,
      "file.txt",
      supabase,
      new AbortController().signal,
      async () => {
        throw new Error("processing failed");
      },
    ),
  ).rejects.toThrow("processing failed");
  expect(supabase.rpc.mock.calls[1]).toEqual([
    "release_storage_file_lock",
    supabase.rpc.mock.calls[0][1],
  ]);
});
it("renews long processing and aborts when the lease is lost", async () => {
  vi.useFakeTimers();
  const supabase = client([
    { data: true, error: null },
    { data: false, error: null },
  ]);
  let seen: AbortSignal | undefined;
  let finish!: () => void;
  const pending = withStorageFileLock(
    storage,
    "file.txt",
    supabase,
    new AbortController().signal,
    async (signal) => {
      seen = signal;
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    },
  );
  await vi.advanceTimersByTimeAsync(30000);
  expect(seen!.aborted).toBe(true);
  finish();
  await pending;
  expect(supabase.rpc.mock.calls[1][0]).toBe("acquire_storage_file_lock");
});
