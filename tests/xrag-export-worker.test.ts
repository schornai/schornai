import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { processXRAGExport } from "../packages/database/src/xrag/processXRAGExport.ts";
const state = vi.hoisted(() => ({
  options: vi.fn(),
  pack: vi.fn(),
  upload: vi.fn(),
  authorize: vi.fn(),
  model: vi.fn(),
}));
vi.mock("../packages/database/src/xrag/getExportWorkerOptions.ts", () => ({
  getExportWorkerOptions: state.options,
}));
vi.mock("../packages/database/src/xrag/streamPackageExport.ts", () => ({
  streamPackageExport: state.pack,
}));
vi.mock("../packages/database/src/xrag/uploadExportStream.ts", () => ({
  uploadExportStream: state.upload,
}));
vi.mock("../packages/database/src/xrag/getAuthorizedResource.ts", () => ({
  getAuthorizedResource: state.authorize,
}));
vi.mock("../packages/database/src/xrag/getModelExportSource.ts", () => ({
  getModelExportSource: state.model,
}));
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.useRealTimers());
function fixture() {
  const job = {
    id: "job",
    user_id: "user",
    name: "package.xrag.tar",
    selections: [{ kind: "agent", id: "agent" }],
    claims: "admin",
    attempts: 1,
  };
  const rpc = vi.fn(async (name: string, _args: any) => ({
    data: name === "claim_xrag_export" ? [job] : true,
    error: null,
  }));
  const remove = vi.fn(async () => ({ error: null }));
  const info = vi.fn(async () => ({ data: { size: 42 }, error: null }));
  const supabase = { rpc, storage: { from: vi.fn(() => ({ remove, info })) } };
  state.options.mockResolvedValue({});
  state.pack.mockImplementation(async (_selection, consume) =>
    consume("stream", 42),
  );
  state.upload.mockImplementation(async (_stream, size, _path, options) =>
    options.onProgress(size),
  );
  return {
    job,
    rpc,
    remove,
    info,
    options: {
      supabase: supabase as any,
      signal: new AbortController().signal,
      endpoint: "http://test",
      token: "private",
    },
  };
}
it("only publishes verified bytes after a fresh permission check", async () => {
  const f = fixture();
  expect(await processXRAGExport(f.options)).toEqual({ worked: true });
  expect(state.options).toHaveBeenCalledTimes(2);
  expect(state.authorize).toHaveBeenCalledWith("agent", "agent", {});
  const finish = f.rpc.mock.calls.find(
    ([, args]) => args.p_state === "finished",
  )![1];
  expect(finish).toMatchObject({
    p_bytes: 42,
    p_total: 42,
    p_path: expect.stringMatching(/^user\/[\da-f-]+\/package.xrag.tar$/),
  });
  expect(f.remove).not.toHaveBeenCalled();
});
it("does no work without a claimed job", async () => {
  const f = fixture();
  f.rpc.mockResolvedValueOnce({ data: [] as any, error: null });
  expect(await processXRAGExport(f.options)).toEqual({ worked: false });
  expect(state.pack).not.toHaveBeenCalled();
});
it.each(["upload", "size", "authorization"])(
  "never publishes after %s failure",
  async (failure) => {
    const f = fixture();
    if (failure === "upload")
      state.upload.mockRejectedValueOnce(new Error("XRAG_UPLOAD_FAILED"));
    if (failure === "size")
      f.info.mockResolvedValueOnce({ data: { size: 0 }, error: null });
    if (failure === "authorization")
      state.options
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("NOT_AUTHORIZED"));
    await processXRAGExport(f.options);
    expect(
      f.rpc.mock.calls.some(([, args]) => args.p_state === "finished"),
    ).toBe(false);
    expect(
      f.rpc.mock.calls.some(
        ([, args]) =>
          args.p_state === (failure === "authorization" ? "error" : "queued"),
      ),
    ).toBe(true);
    expect(f.remove).toHaveBeenCalledTimes(1);
  },
);
it("finishes a permanently unavailable model reference as an error on the first attempt", async () => {
  const f = fixture();
  state.pack.mockRejectedValueOnce(new Error("XRAG_REFERENCE_UNAVAILABLE"));
  await processXRAGExport(f.options);
  expect(f.rpc).toHaveBeenCalledWith(
    "update_xrag_export",
    expect.objectContaining({ p_state: "error" }),
  );
  expect(state.upload).not.toHaveBeenCalled();
});
it("lease loss aborts a running stream and prevents completion", async () => {
  vi.useFakeTimers();
  const f = fixture();
  f.rpc.mockImplementation(async (name) => ({
    data: name === "claim_xrag_export" ? [f.job] : false,
    error: null,
  }));
  state.upload.mockImplementation(
    (_s, _size, _path, options) =>
      new Promise((_, reject) =>
        options.signal.addEventListener(
          "abort",
          () => reject(options.signal.reason),
          { once: true },
        ),
      ),
  );
  const pending = processXRAGExport(f.options);
  await vi.advanceTimersByTimeAsync(20_000);
  await pending;
  expect(f.rpc.mock.calls.some(([, args]) => args.p_state === "finished")).toBe(
    false,
  );
  expect(f.remove).toHaveBeenCalled();
});
it("graceful shutdown leaves the job reclaimable and removes only its own output", async () => {
  const f = fixture();
  const controller = new AbortController();
  state.upload.mockImplementation(async () => {
    controller.abort(new Error("shutdown"));
    throw controller.signal.reason;
  });
  await expect(
    processXRAGExport({ ...f.options, signal: controller.signal }),
  ).rejects.toThrow("shutdown");
  expect(
    f.rpc.mock.calls.some(
      ([, args]) => args.p_state === "queued" || args.p_state === "error",
    ),
  ).toBe(false);
  expect(f.remove).toHaveBeenCalledWith([
    expect.stringMatching(/^user\/[\da-f-]+\/package.xrag.tar$/),
  ]);
});

it("preserves a published file when the completion response was lost", async () => {
  const f = fixture();
  let resultPath: string | undefined;
  f.rpc.mockImplementation(async (name, args) => {
    if (name === "claim_xrag_export") return { data: [f.job], error: null };
    if (args.p_state === "finished") {
      resultPath = args.p_path;
      return { data: false, error: { message: "network" } as any };
    }
    return { data: false, error: null };
  });
  const { query } = await import("./helpers/supabase.ts");
  (f.options.supabase as any).from = vi.fn(() =>
    query({
      data: { state: "finished", object_path: resultPath },
      error: null,
    }),
  );
  await processXRAGExport(f.options);
  expect(f.remove).not.toHaveBeenCalled();
});
