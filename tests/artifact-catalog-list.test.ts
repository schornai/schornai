import { beforeEach, expect, it, vi } from "vitest";
import { listArtifacts } from "../packages/database/src/xrag/listArtifacts.ts";
import { listAllArtifacts } from "../packages/database/src/xrag/listAllArtifacts.ts";

let bucket: any;
let supabase: any;
const artifact = (id: string, createdAt = "2026-10-24T12:00:00Z") => ({
  id: id.repeat(64),
  name: "example.tar",
  size: 1,
  createdAt,
  xrag: { xrag_version: 1, xrag_type: "setup" },
});
beforeEach(() => {
  bucket = {
    list: vi.fn(),
    download: vi.fn(async (path: string) => ({
      data: new Blob([JSON.stringify(artifact(path[8]!))]),
      error: null,
    })),
  };
  supabase = { storage: { from: vi.fn().mockReturnValue(bucket) } };
});

it("lists only valid catalog markers and pages by raw storage entries", async () => {
  const data = [
    { name: `${"a".repeat(64)}.json` },
    ...Array.from({ length: 99 }, (_, index) => ({
      name: `unrelated-${index}`,
    })),
  ];
  bucket.list.mockResolvedValue({ data, error: null });
  await expect(listArtifacts(100, { supabase })).resolves.toEqual({
    artifacts: [artifact("a")],
    nextOffset: 200,
  });
  expect(bucket.list).toHaveBeenCalledWith("catalog", {
    offset: 100,
    limit: 100,
    sortBy: { column: "name", order: "asc" },
  });
  expect(bucket.download).toHaveBeenCalledOnce();
});

it("collects all pages and sorts by newest creation time then identifier", async () => {
  bucket.list
    .mockResolvedValueOnce({
      data: [
        { name: `${"a".repeat(64)}.json` },
        ...Array.from({ length: 99 }, () => ({ name: "ignored" })),
      ],
      error: null,
    })
    .mockResolvedValueOnce({
      data: [
        { name: `${"b".repeat(64)}.json` },
        { name: `${"c".repeat(64)}.json` },
      ],
      error: null,
    });
  bucket.download.mockImplementation(async (path: string) => ({
    data: new Blob([
      JSON.stringify(
        artifact(
          path[8]!,
          path[8] === "a" ? "2026-10-25T12:00:00Z" : undefined,
        ),
      ),
    ]),
    error: null,
  }));
  const result = await listAllArtifacts({ supabase });
  expect(result.map((item) => item.id)).toEqual(
    ["a", "c", "b"].map((id) => id.repeat(64)),
  );
  expect(
    bucket.list.mock.calls.map(([, options]: any[]) => options.offset),
  ).toEqual([0, 100]);
});

it.each([
  { data: null, error: null },
  { data: [], error: { message: "private details" } },
])("rejects unavailable catalogs", async (result) => {
  bucket.list.mockResolvedValue(result);
  await expect(listArtifacts(0, { supabase })).rejects.toThrow(
    "CATALOG_UNAVAILABLE",
  );
});

it("returns an empty collection for an empty catalog", async () => {
  bucket.list.mockResolvedValue({ data: [], error: null });
  await expect(listAllArtifacts({ supabase })).resolves.toEqual([]);
});
