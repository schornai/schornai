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
it("withdraws before removing bytes and retries a failed purge without resetting withdrawal", async () => {
  const row = {
    id: artifact.id,
    metadata: artifact,
    created_at: artifact.createdAt,
    object_path: "uploads/original/model.tar",
    deleted_at: null as string | null,
    purged_at: null as string | null,
  };
  const remove = vi.fn(async () => {
    expect(row.deleted_at).toBeTruthy();
    return { error: null as any };
  });
  remove.mockResolvedValueOnce({ error: { message: "offline" } });
  const from = () => {
    let update: Record<string, unknown> | undefined;
    let condition: string | undefined;
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      single: () => builder,
      maybeSingle: () => builder,
      is: (column: string) => {
        condition = column;
        return builder;
      },
      update: (value: Record<string, unknown>) => {
        update = value;
        return builder;
      },
      then: (resolve: any, reject: any) => {
        if (
          update &&
          (!condition || row[condition as keyof typeof row] === null)
        )
          Object.assign(row, update);
        return Promise.resolve({ data: row, error: null }).then(
          resolve,
          reject,
        );
      },
    };
    return builder;
  };
  const supabase = {
    from,
    storage: { from: () => ({ remove }) },
  } as unknown as SupabaseClient;
  await expect(deleteArtifact(artifact.id, { supabase })).rejects.toThrow(
    "ARTIFACT_DELETE_FAILED",
  );
  const withdrawn = await getArtifact(artifact.id, { supabase });
  expect(withdrawn.deletedAt).toBeTruthy();
  expect(withdrawn.purgedAt).toBeUndefined();
  const deleted = await deleteArtifact(artifact.id, { supabase });
  expect(deleted.deletedAt).toBe(withdrawn.deletedAt);
  expect(deleted.purgedAt).toBeTruthy();
  expect(remove).toHaveBeenLastCalledWith([row.object_path]);
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
