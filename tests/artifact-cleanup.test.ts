import { expect, it, vi } from "vitest";
import { cleanupArtifactPublications } from "../packages/database/src/xrag/cleanupArtifactPublications.ts";
import { listAllArtifacts } from "../packages/database/src/xrag/listAllArtifacts.ts";
import { deleteArtifact } from "../packages/database/src/xrag/deleteArtifact.ts";
vi.mock("../packages/database/src/xrag/listAllArtifacts.ts", () => ({
  listAllArtifacts: vi.fn(async () => []),
}));
vi.mock("../packages/database/src/xrag/deleteArtifact.ts", () => ({
  deleteArtifact: vi.fn(),
}));
import { query } from "./helpers/supabase.ts";
it.each([true, false])(
  "cleans unused uploads but retains the adopted archive (adopted=%s)",
  async (adopted) => {
    const done = query();
    const from = vi
      .fn()
      .mockReturnValueOnce(
        query({
          data: [
            { id: "job", upload_path: "uploads/file.tar", state: "published" },
          ],
        }),
      )
      .mockReturnValueOnce(
        query({ data: adopted ? { id: "digest", deleted_at: null } : null }),
      )
      .mockReturnValueOnce(done)
      .mockReturnValueOnce(query({ data: [] }));
    const remove = vi.fn(async () => ({ error: null }));
    const supabase = {
      from,
      rpc: vi.fn(async () => ({ data: 0 })),
      storage: { from: () => ({ remove }) },
    } as any;
    await cleanupArtifactPublications({ supabase });
    expect(remove).toHaveBeenCalledTimes(adopted ? 0 : 1);
    expect(done.update).toHaveBeenCalledWith({
      cleaned_at: expect.any(String),
    });
  },
);
it("leaves a failed cleanup unacknowledged for retry", async () => {
  const from = vi
    .fn()
    .mockReturnValueOnce(
      query({
        data: [{ id: "job", upload_path: "uploads/file.tar", state: "error" }],
      }),
    )
    .mockReturnValueOnce(query({ data: null }));
  const supabase = {
    from,
    rpc: vi.fn(async () => ({ data: 0 })),
    storage: {
      from: () => ({
        remove: async () => ({ error: { message: "private storage error" } }),
      }),
    },
  } as any;
  await expect(cleanupArtifactPublications({ supabase })).rejects.toThrow(
    "ARTIFACT_CLEANUP_FAILED",
  );
  expect(from).toHaveBeenCalledTimes(2);
});

it("retires superseded setup bytes, retaining other platforms and model archives", async () => {
  const artifact = (id: string, date: string, platform: string) => ({
    id: id.repeat(64),
    createdAt: date,
    name: "setup.xrag.tar",
    size: 100,
    xrag: { xrag_version: 1, xrag_type: "setup", platform, arch: "arm64" },
  });
  const older = artifact("a", "2026-11-07T00:00:00Z", "darwin");
  const latest = artifact("b", "2026-11-08T00:00:00Z", "darwin");
  const linux = artifact("c", "2026-11-06T00:00:00Z", "linux");
  const model = {
    ...older,
    id: "d".repeat(64),
    xrag: {
      xrag_version: 1,
      xrag_type: "files",
      targets: ["core"],
      name: "assets",
    },
  };
  vi.mocked(listAllArtifacts).mockResolvedValueOnce([
    older,
    latest,
    linux,
    model,
  ]);
  const supabase = {
    rpc: vi.fn(async () => ({ data: 0 })),
    from: vi.fn(() => query({ data: [] })),
  } as any;
  await cleanupArtifactPublications({ supabase });
  expect(deleteArtifact).toHaveBeenCalledExactlyOnceWith(older.id, {
    supabase,
  });
});
