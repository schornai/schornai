import { afterEach, expect, it, vi } from "vitest";
import { query } from "./helpers/supabase.ts";
import { importBackend } from "./helpers/xragImport.ts";
import {
  readImport,
  renewImport,
  setImportApplying,
} from "../packages/database/src/xrag/importTransaction.ts";
import { withImportLease } from "../packages/database/src/xrag/withImportLease.ts";
import { recoverXRAGImport } from "../packages/database/src/xrag/recoverXRAGImport.ts";
const state = vi.hoisted(() => ({ client: undefined as any }));
vi.mock("../packages/database/src/xrag/createImportStorageClient.ts", () => ({
  createImportStorageClient: () => state.client,
}));
afterEach(() => vi.useRealTimers());
const plan = {
  entries: [],
  claims: "admin",
  files: [],
  artifacts: [],
  processing: [],
};
async function fixture() {
  const b = importBackend();
  state.client = b.client;
  const id = crypto.randomUUID(),
    token = crypto.randomUUID();
  await b.client.rpc("begin_xrag_import", {
    p_id: id,
    p_token: token,
    p_user_id: "user",
    p_plan: plan,
  });
  return { ...b, id, token };
}
it("sanitizes unavailable state and refuses missing or lost leases", async () => {
  const b = await fixture();
  await expect(readImport("missing", b.client as any)).rejects.toThrow(
    "STATE_UNAVAILABLE",
  );
  await expect(renewImport(b.id, "wrong", b.client as any)).rejects.toThrow(
    "LEASE_LOST",
  );
  await expect(
    setImportApplying(b.id, "wrong", b.client as any),
  ).rejects.toThrow("LEASE_LOST");
});
it("renews a running import and aborts work when ownership is lost", async () => {
  vi.useFakeTimers();
  const b = await fixture();
  const running = withImportLease(
    b.id,
    b.token,
    b.client as any,
    undefined,
    (signal) =>
      new Promise<void>((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      ),
  );
  const rejected = expect(running).rejects.toThrow("LEASE_LOST");
  await vi.advanceTimersByTimeAsync(30000);
  expect(b.jobs.get(b.id).expires_at).toBeTruthy();
  b.jobs.get(b.id).token = "new-owner";
  await vi.advanceTimersByTimeAsync(30000);
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
});
it("clears its renewal timer on cancellation and on successful completion", async () => {
  vi.useFakeTimers();
  const b = await fixture();
  await expect(
    withImportLease(
      b.id,
      b.token,
      b.client as any,
      AbortSignal.abort(new Error("cancel")),
      async () => 1,
    ),
  ).rejects.toThrow("cancel");
  await expect(
    withImportLease(b.id, b.token, b.client as any, undefined, async () => 1),
  ).resolves.toBe(1);
  expect(vi.getTimerCount()).toBe(0);
});
it("does not recover another caller's live import or already cleaned work", async () => {
  const b = await fixture();
  await recoverXRAGImport(b.id, { supabase: b.client as any, token: "wrong" });
  expect(b.jobs.get(b.id).state).toBe("preparing");
  b.jobs.get(b.id).cleaned_at = "done";
  await recoverXRAGImport(b.id, { supabase: b.client as any });
  expect(b.remove).not.toHaveBeenCalled();
});
it("retains recovery ownership when target deletion fails", async () => {
  const b = await fixture();
  Object.assign(b.jobs.get(b.id), {
    files_applied: true,
    plan: {
      ...plan,
      files: [
        {
          path: "file",
          basePath: "file",
          stage: "stage",
          backup: "backup",
          hadOriginal: false,
          remove: false,
        },
      ],
    },
  });
  b.remove.mockResolvedValueOnce({ error: new Error("offline") });
  await expect(
    recoverXRAGImport(b.id, { supabase: b.client as any, token: b.token }),
  ).rejects.toThrow("RECOVERY_FAILED");
  expect(b.jobs.get(b.id).state).toBe("rolling_back");
  expect(b.jobs.get(b.id).cleaned_at).toBeNull();
  await recoverXRAGImport(b.id, { supabase: b.client as any });
  expect(b.jobs.get(b.id).state).toBe("rolled_back");
});
it("retries terminal cleanup without changing committed files", async () => {
  const b = await fixture();
  Object.assign(b.jobs.get(b.id), {
    state: "committed",
    plan: {
      ...plan,
      files: [
        {
          path: "file",
          basePath: "file",
          stage: "stage",
          backup: "backup",
          hadOriginal: false,
          remove: false,
        },
      ],
    },
  });
  b.remove.mockResolvedValueOnce({ error: new Error("offline") });
  await expect(
    recoverXRAGImport(b.id, { supabase: b.client as any }),
  ).rejects.toThrow("CLEANUP_FAILED");
  expect(b.jobs.get(b.id).cleaned_at).toBeNull();
  await recoverXRAGImport(b.id, { supabase: b.client as any });
  expect(b.jobs.get(b.id).cleaned_at).toBeTruthy();
  expect(b.remove).not.toHaveBeenCalledWith(
    "database_files",
    expect.anything(),
  );
});
it("does not hide a failed rollback acknowledgement or cleanup acknowledgement", async () => {
  const b = await fixture();
  b.client.rpc.mockResolvedValueOnce({
    data: null,
    error: new Error("offline"),
  });
  await expect(
    recoverXRAGImport(b.id, { supabase: b.client as any, token: b.token }),
  ).rejects.toThrow("RECOVERY_FAILED");
  const original = b.client.from.getMockImplementation()!;
  b.jobs.get(b.id).state = "rolled_back";
  b.client.from
    .mockImplementationOnce(original)
    .mockImplementationOnce(() => query({ error: new Error("offline") }));
  await expect(
    recoverXRAGImport(b.id, { supabase: b.client as any }),
  ).rejects.toThrow("CLEANUP_FAILED");
});
