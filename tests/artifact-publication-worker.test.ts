import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { c } from "tar";
import { afterEach, expect, it, vi } from "vitest";
import { processArtifactPublication } from "../packages/database/src/xrag/processArtifactPublication.ts";
import { announceArtifactPublications } from "../packages/database/src/xrag/announceArtifactPublications.ts";
import { query } from "./helpers/supabase.ts";
const mocks = vi.hoisted(() => ({ stream: vi.fn(), register: vi.fn() }));
vi.mock("../packages/database/src/xrag/getArtifactStream.ts", () => ({
  getArtifactStream: mocks.stream,
}));
vi.mock("../packages/database/src/xrag/registerArtifactModel.ts", () => ({
  registerArtifactModel: mocks.register,
}));
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "artifact-publication-"));
  roots.push(root);
  const xrag = {
    xrag_version: 1,
    xrag_type: "files",
    targets: ["service"],
    name: "data",
  };
  await writeFile(join(root, "xrag.json"), JSON.stringify(xrag));
  await writeFile(join(root, "data"), "payload");
  await c({ file: join(root, "archive.tar"), cwd: root }, [
    "xrag.json",
    "data",
  ]);
  const bytes = await readFile(join(root, "archive.tar"));
  const id = createHash("sha256").update(bytes).digest("hex");
  const job = {
    id: "00000000-0000-4000-8000-000000000001",
    upload_path: "uploads/00000000-0000-4000-8000-000000000001/example.tar",
    name: "example.tar",
    created_at: "2026-11-08T12:00:00Z",
  };
  mocks.stream.mockImplementation(async () => new Response(bytes).body);
  mocks.register.mockResolvedValue(undefined);
  const rpc = vi.fn(async (name: string) => ({
    data:
      name === "claim_artifact_publication"
        ? [job]
        : name === "finish_artifact_publication"
          ? id
          : true,
    error: null as any,
  }));
  return {
    rpc,
    job,
    id,
    bytes,
    xrag,
    run: (overrides = {}) =>
      processArtifactPublication({
        supabase: { rpc } as any,
        signal: new AbortController().signal,
        ...overrides,
      }),
  };
}
it("streams and verifies the original upload then atomically publishes its metadata", async () => {
  const { run, rpc, job, id, xrag, bytes } = await fixture();
  await expect(run()).resolves.toEqual({ worked: true, artifactId: id });
  expect(mocks.stream).toHaveBeenCalledWith(job.upload_path, expect.anything());
  const owner = rpc.mock.calls[0]![1]!.p_owner_token;
  expect(rpc).toHaveBeenLastCalledWith("finish_artifact_publication", {
    p_id: job.id,
    p_owner_token: owner,
    p_metadata: {
      id,
      name: job.name,
      size: bytes.length,
      createdAt: new Date(job.created_at).toISOString(),
      xrag,
    },
  });
});
it("records oversized input as a terminal failure without publishing", async () => {
  const { run, rpc } = await fixture();
  await expect(run({ maxArchiveBytes: 1 })).resolves.toEqual({ worked: true });
  expect(rpc).toHaveBeenLastCalledWith(
    "fail_artifact_publication",
    expect.objectContaining({ p_retryable: false }),
  );
  expect(mocks.register).not.toHaveBeenCalled();
});
it("retries transport failures through the durable job, not a live browser request", async () => {
  const { run, rpc } = await fixture();
  mocks.stream.mockRejectedValue(new Error("Storage unavailable"));
  await run();
  expect(rpc).toHaveBeenLastCalledWith(
    "fail_artifact_publication",
    expect.objectContaining({ p_retryable: true }),
  );
});
it("leaves an aborted owner's job to lease recovery instead of marking it published", async () => {
  const { run, rpc } = await fixture();
  const controller = new AbortController();
  mocks.register.mockImplementationOnce(async () => {
    controller.abort(new Error("shutdown"));
  });
  await expect(run({ signal: controller.signal })).rejects.toThrow("shutdown");
  expect(rpc.mock.calls.map(([name]) => name)).toEqual([
    "claim_artifact_publication",
  ]);
});
it("does no work when another worker owns every pending publication", async () => {
  const { run, rpc } = await fixture();
  rpc.mockResolvedValueOnce({ data: [], error: null });
  await expect(run()).resolves.toEqual({ worked: false });
  expect(mocks.stream).not.toHaveBeenCalled();
});
it("does not acknowledge an outbox entry until realtime delivery succeeds", async () => {
  const pending = query({ data: [{ id: "job", artifact_id: "digest" }] });
  const acknowledged = query();
  const from = vi
    .fn()
    .mockReturnValueOnce(pending)
    .mockReturnValueOnce(pending)
    .mockReturnValueOnce(acknowledged);
  const supabase = { from } as any;
  const announce = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(undefined);
  await expect(
    announceArtifactPublications(announce, { supabase }),
  ).rejects.toThrow("offline");
  expect(from).toHaveBeenCalledTimes(1);
  await announceArtifactPublications(announce, { supabase });
  expect(announce).toHaveBeenCalledTimes(2);
  expect(acknowledged.update).toHaveBeenCalledWith({
    announced_at: expect.any(String),
  });
});
