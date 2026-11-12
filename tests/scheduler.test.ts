import { afterEach, expect, it, vi } from "vitest";
import { schedulerWorker } from "../apps/realtime/src/scheduler/worker.ts";
import { scheduleJob } from "../packages/database/src/scheduler/scheduleJob.ts";
import { cancelJob } from "../packages/database/src/scheduler/cancelJob.ts";
import { renewJob } from "../packages/database/src/scheduler/renewJob.ts";
import { finishJob } from "../packages/database/src/scheduler/finishJob.ts";
import { claimJob } from "../packages/database/src/scheduler/claimJob.ts";
import { startScheduler } from "../apps/realtime/src/scheduler/startScheduler.ts";

const cleanup = vi.hoisted(() => vi.fn());
vi.mock("../packages/database/src/xrag/cleanupArtifactPublications.ts", () => ({
  cleanupArtifactPublications: cleanup,
}));
// Use the real worker and database wrappers; only time and database transport vary.
vi.mock("node:timers/promises", () => ({
  setTimeout: (
    ms: number,
    value: unknown,
    { signal }: { signal: AbortSignal },
  ) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason);
      const abort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      }, ms);
      signal.addEventListener("abort", abort, { once: true });
    }),
}));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
function fixture(
  handler = vi.fn(async () => {}),
  overrides: Record<string, unknown> = {},
) {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  const stop = new AbortController();
  const job = {
    id: "job",
    kind: "test",
    lease_token: "token",
    payload: {},
    ...overrides,
  };
  let claimed = false;
  const rpc = vi.fn(async (name: string) => {
    if (name === "claim_scheduled_job") {
      if (!claimed) {
        claimed = true;
        return { data: [job], error: null };
      }
      stop.abort();
      return { data: [], error: null };
    }
    return { data: true, error: null };
  });
  const supabase = { rpc } as any;
  return {
    stop,
    rpc,
    job,
    supabase,
    run: () =>
      schedulerWorker({
        supabase,
        handlers: new Map([["test", handler]]),
        signal: stop.signal,
      }),
  };
}
it("executes supported work and acknowledges with the exact lease", async () => {
  const handler = vi.fn(async () => {});
  const f = fixture(handler);
  await f.run();
  expect(handler).toHaveBeenCalledWith(f.job, expect.any(AbortSignal));
  expect(f.rpc).toHaveBeenCalledWith("claim_scheduled_job", {
    p_kinds: ["test"],
  });
  expect(f.rpc).toHaveBeenCalledWith("finish_scheduled_job", {
    p_id: "job",
    p_token: "token",
    p_success: true,
  });
});
it("does not execute or acknowledge a job without a lease token", async () => {
  const handler = vi.fn(async () => {});
  const f = fixture(handler, { lease_token: null });
  const running = f.run();
  await vi.advanceTimersByTimeAsync(1_000);
  await running;
  expect(handler).not.toHaveBeenCalled();
  expect(
    f.rpc.mock.calls.every(([name]) => name === "claim_scheduled_job"),
  ).toBe(true);
  expect(console.error).toHaveBeenCalledWith("SCHEDULER_UNAVAILABLE");
});
it("records failure without logging payloads or arbitrary errors", async () => {
  const f = fixture(
    vi.fn(async () => {
      throw new Error("secret");
    }),
  );
  await f.run();
  expect(f.rpc).toHaveBeenCalledWith(
    "finish_scheduled_job",
    expect.objectContaining({ p_success: false }),
  );
  expect(console.error).toHaveBeenCalledWith(
    "SCHEDULER_HANDLER_FAILED",
    "test",
  );
});
it.each([false, "unavailable"])(
  "aborts execution on lease loss: %s",
  async (result) => {
    let aborted = false;
    const f = fixture(
      vi.fn(async (_job, signal: AbortSignal) => {
        await new Promise<void>((resolve) =>
          signal.addEventListener(
            "abort",
            () => {
              aborted = true;
              f.stop.abort();
              resolve();
            },
            { once: true },
          ),
        );
      }),
    );
    f.rpc.mockImplementation(async (name) => {
      if (name === "claim_scheduled_job")
        return { data: [f.job], error: null } as any;
      return {
        data: result === false ? false : null,
        error: result === false ? null : {},
      } as any;
    });
    const running = f.run();
    await vi.advanceTimersByTimeAsync(20_000);
    await running;
    expect(aborted).toBe(true);
    expect(
      f.rpc.mock.calls.some(([name]) => name === "finish_scheduled_job"),
    ).toBe(false);
  },
);
it("renews a long handler before finishing it", async () => {
  let finish!: () => void;
  const f = fixture(
    vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    ),
  );
  const running = f.run();
  await vi.advanceTimersByTimeAsync(20_000);
  expect(f.rpc).toHaveBeenCalledWith("renew_scheduled_job", {
    p_id: "job",
    p_token: "token",
  });
  finish();
  await running;
});
it("retries database outages and idle polls until shutdown", async () => {
  const f = fixture();
  f.rpc
    .mockResolvedValueOnce({ data: null, error: {} } as any)
    .mockResolvedValueOnce({ data: [], error: null } as any);
  const running = f.run();
  await vi.advanceTimersByTimeAsync(2_000);
  await running;
  expect(console.error).toHaveBeenCalledWith("SCHEDULER_UNAVAILABLE");
});
it("does not start a handler when shutdown occurs during claiming", async () => {
  const handler = vi.fn();
  const f = fixture(handler);
  f.rpc.mockImplementationOnce(async () => {
    f.stop.abort();
    return { data: [f.job], error: null } as any;
  });
  await f.run();
  expect(handler).not.toHaveBeenCalled();
});
it("reports a rejected completion and continues polling", async () => {
  const f = fixture();
  f.rpc
    .mockResolvedValueOnce({ data: [f.job], error: null } as any)
    .mockResolvedValueOnce({ data: false, error: null } as any);
  await f.run();
  expect(console.error).toHaveBeenCalledWith("SCHEDULER_LEASE_LOST", "test");
});
it("returns immediately without registered handlers", async () => {
  const f = fixture();
  await schedulerWorker({
    supabase: f.supabase,
    handlers: new Map(),
    signal: f.stop.signal,
  });
  expect(f.rpc).not.toHaveBeenCalled();
});
it("registers recurring cleanup once and runs it through the scheduler", async () => {
  const f = fixture(undefined, { kind: "artifacts.cleanup" });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  f.supabase.from = vi.fn(() => ({ upsert }));
  await startScheduler({
    supabase: f.supabase,
    signal: f.stop.signal,
    instance: {} as any,
  });
  expect(upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "system:artifacts.cleanup",
      interval_seconds: 60,
    }),
    { onConflict: "id", ignoreDuplicates: true },
  );
  expect(cleanup).toHaveBeenCalledWith(
    expect.objectContaining({ supabase: f.supabase }),
  );
});
it("cancels by ID and sanitizes mutation errors", async () => {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const upsert = vi.fn().mockResolvedValue({ error: { message: "secret" } });
  const supabase = {
    from: vi.fn(() => ({ delete: () => ({ eq }), upsert })),
  } as any;
  await cancelJob("job", { supabase });
  expect(eq).toHaveBeenCalledWith("id", "job");
  eq.mockResolvedValueOnce({ error: {} });
  await expect(cancelJob("job", { supabase })).rejects.toThrow(
    "SCHEDULER_CANCEL_FAILED",
  );
  await expect(
    scheduleJob(
      { id: "job", kind: "test", payload: {}, runAt: new Date() },
      { supabase },
    ),
  ).rejects.toThrow("SCHEDULER_SCHEDULE_FAILED");
});
it("sanitizes RPC failures", async () => {
  const options = {
    supabase: {
      rpc: vi.fn().mockResolvedValue({ error: {}, data: null }),
    } as any,
  };
  await expect(claimJob(["test"], options)).rejects.toThrow(
    "SCHEDULER_CLAIM_FAILED",
  );
  await expect(renewJob("id", "token", options)).rejects.toThrow(
    "SCHEDULER_RENEW_FAILED",
  );
  await expect(finishJob("id", "token", true, options)).rejects.toThrow(
    "SCHEDULER_FINISH_FAILED",
  );
});
