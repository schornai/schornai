import { expect, it, vi } from "vitest";
import { listArtifacts } from "../packages/database/src/xrag/listArtifacts.ts";
import { listAllArtifacts } from "../packages/database/src/xrag/listAllArtifacts.ts";
import { query } from "./helpers/supabase.ts";
const row = (number: number) => ({
  id: number.toString(16).padStart(64, "0"),
  object_path: `uploads/${number}/archive.tar`,
  created_at: "2026-11-08T12:00:00Z",
  deleted_at: null,
  purged_at: null,
  metadata: {
    id: number.toString(16).padStart(64, "0"),
    name: "archive.tar",
    size: 100,
    createdAt: "2026-11-08T12:00:00Z",
    xrag: { xrag_type: "files", xrag_version: 1 },
  },
});
it("reads a bounded SQL page without fetching each metadata object or exposing storage paths", async () => {
  const builder = query({
    data: Array.from({ length: 100 }, (_, i) => row(i)),
  });
  const result = await listArtifacts(100, {
    supabase: { from: () => builder } as any,
  });
  expect(builder.range).toHaveBeenCalledWith(100, 199);
  expect(result.nextOffset).toBe(200);
  expect(result.artifacts).toHaveLength(100);
  expect(result.artifacts[0]).not.toHaveProperty("object_path");
});
it("collects all pages and sorts by creation time and digest", async () => {
  const from = vi
    .fn()
    .mockReturnValueOnce(
      query({ data: Array.from({ length: 100 }, (_, i) => row(i)) }),
    )
    .mockReturnValueOnce(query({ data: [row(100)] }));
  const result = await listAllArtifacts({ supabase: { from } as any });
  expect(result).toHaveLength(101);
  expect(result[0]?.id).toBe(row(100).id);
});
it.each([{ data: null }, { data: [], error: { message: "private details" } }])(
  "sanitizes unavailable catalogs",
  async (response) => {
    await expect(
      listArtifacts(0, { supabase: { from: () => query(response) } as any }),
    ).rejects.toThrow("CATALOG_UNAVAILABLE");
  },
);
it("returns an empty collection", async () => {
  await expect(
    listAllArtifacts({ supabase: { from: () => query({ data: [] }) } as any }),
  ).resolves.toEqual([]);
});
