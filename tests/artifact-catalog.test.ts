import { it, expect, vi } from "vitest";
import { Doc } from "yjs";
import { deleteArtifact } from "../packages/database/src/xrag/deleteArtifact.ts";
import { getArtifact } from "../packages/database/src/xrag/getArtifact.ts";
import {
  addArtifactLog,
  applyArtifactLog,
  getArtifactLog,
} from "../packages/realtime/src/documents/artifactCatalog/_utils.ts";
import type { SupabaseClient } from "../packages/database/src/_shared/_types.ts";
const artifact = {
  id: "a".repeat(64),
  name: "setup.tar",
  size: 123,
  createdAt: "2026-10-24T12:00:00Z",
  xrag: { xrag_version: 1 as const, xrag_type: "setup" as const },
};
it("withdraws before removing bytes, preserves a release tombstone, and safely retries failed purges", async () => {
  const objects = new Map<string, Blob>([
    [`catalog/${artifact.id}.json`, new Blob([JSON.stringify(artifact)])],
    [`artifacts/${artifact.id}.tar`, new Blob(["bytes"])],
  ]);
  const remove = vi.fn(async (paths: string[]) => {
    for (const path of paths) objects.delete(path);
    return { error: null };
  });
  remove.mockResolvedValueOnce({ error: { message: "offline" } } as any);
  const bucket = {
    download: vi.fn(async (path: string) => ({
      data: objects.get(path),
      error: null,
    })),
    upload: vi.fn(async (path: string, body: string) => {
      objects.set(path, new Blob([body]));
      return { error: null };
    }),
    remove,
  };
  const supabase = {
    storage: { from: () => bucket },
  } as unknown as SupabaseClient;
  await expect(deleteArtifact(artifact.id, { supabase })).rejects.toThrow(
    "ARTIFACT_DELETE_FAILED",
  );
  const withdrawn = await getArtifact(artifact.id, { supabase });
  expect(withdrawn.deletedAt).toBeTruthy();
  expect(withdrawn.purgedAt).toBeUndefined();
  expect(objects.has(`artifacts/${artifact.id}.tar`)).toBe(true);
  const deleted = await deleteArtifact(artifact.id, { supabase });
  expect(deleted.purgedAt).toBeTruthy();
  expect(deleted.deletedAt).toBe(withdrawn.deletedAt);
  expect(objects.has(`artifacts/${artifact.id}.tar`)).toBe(false);
  expect((await getArtifact(artifact.id, { supabase })).createdAt).toBe(
    artifact.createdAt,
  );
  await expect(
    deleteArtifact(artifact.id, { supabase }),
  ).resolves.toMatchObject({ id: artifact.id });
});
it("bounded CRUD updates cannot resurrect a deleted artifact over a newer Storage snapshot", () => {
  const doc = new Doc();
  try {
    addArtifactLog(doc, artifact);
    const deleted = {
      ...artifact,
      deletedAt: "2026-10-24T13:00:00Z",
      purgedAt: "2026-10-24T13:00:01Z",
    };
    expect(
      applyArtifactLog([deleted], getArtifactLog(doc).toArray())[0]?.purgedAt,
    ).toBeTruthy();
    addArtifactLog(doc, deleted);
    expect(getArtifactLog(doc).toArray().at(-1)?.operation).toBe("removed");
    expect(
      applyArtifactLog([artifact], getArtifactLog(doc).toArray())[0]?.deletedAt,
    ).toBeTruthy();
    for (let i = 0; i < 1010; i++) addArtifactLog(doc, artifact);
    expect(getArtifactLog(doc).length).toBe(1000);
  } finally {
    doc.destroy();
  }
});
