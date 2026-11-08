import { expect, it, vi } from "vitest";
import { publishArtifact } from "../packages/database/src/xrag/publishArtifact.ts";
import { query } from "./helpers/supabase.ts";

it.each([
  "",
  ".",
  "..",
  "folder/name.tar",
  "file\\name.tar",
  "uploads/not-a-uuid/file.tar",
])(
  "rejects invalid upload location %s before accessing storage",
  async (path) => {
    await expect(
      publishArtifact(path, { supabase: {} as any }),
    ).rejects.toThrow("INVALID_ARTIFACT_NAME");
  },
);
it("queues a durable publication without reading or copying archive bytes", async () => {
  const existing = query({ data: null });
  const queued = query({ data: null });
  const saved = query({ data: { id: "job-id" } });
  const info = vi.fn(async () => ({ data: { size: 123 } }));
  const supabase = {
    from: vi
      .fn()
      .mockReturnValueOnce(existing)
      .mockReturnValueOnce(queued)
      .mockReturnValueOnce(saved),
    storage: { from: () => ({ info }) },
  } as any;
  await expect(publishArtifact("model.tar", { supabase })).resolves.toBe(
    "job-id",
  );
  expect(queued.upsert).toHaveBeenCalledWith(
    { upload_path: "model.tar", name: "model.tar" },
    { onConflict: "upload_path", ignoreDuplicates: true },
  );
  expect(info).toHaveBeenCalledWith("model.tar");
});
it("returns the same job for repeated submissions, even after duplicate-upload cleanup", async () => {
  const supabase = {
    from: () => query({ data: { id: "existing-job" } }),
  } as any;
  await expect(publishArtifact("model.tar", { supabase })).resolves.toBe(
    "existing-job",
  );
});
it.each([undefined, 0, 201 * 1024 ** 3])(
  "rejects missing or oversized uploads (%s)",
  async (size) => {
    const from = vi.fn(() => query({ data: null }));
    const supabase = {
      from,
      storage: { from: () => ({ info: async () => ({ data: { size } }) }) },
    } as any;
    await expect(publishArtifact("model.tar", { supabase })).rejects.toThrow(
      "XRAG_PUBLISH_FAILED",
    );
    expect(from).toHaveBeenCalledTimes(1);
  },
);
