import { expect, it, vi } from "vitest";
import { publishArtifact } from "../packages/database/src/xrag/publishArtifact.ts";
import type { SupabaseClient } from "../packages/database/src/_shared/_types.ts";

const { artifact } = vi.hoisted(() => ({
  artifact: {
    id: "b".repeat(64),
    name: "test.tar",
    size: 123,
    createdAt: "2026-10-24T12:00:00Z",
    xrag: {
      xrag_version: 1,
      xrag_type: "files",
      name: "test",
      targets: ["service"],
    },
  },
}));
vi.mock("xrag/archive", () => ({
  inspectArchive: async () => ({ ...artifact, metadata: new Map() }),
}));
vi.mock("../packages/database/src/xrag/getArtifactStream.ts", () => ({
  getArtifactStream: async () => new ReadableStream(),
}));

it.each([false, true])(
  "publication preserves immutable metadata and concurrent withdrawal (%s)",
  async (withdraw) => {
    const marker = `catalog/${artifact.id}.json`;
    const archive = `artifacts/${artifact.id}.tar`;
    const upload = "uploads/00000000-0000-4000-8000-000000000001/test.tar";
    const objects = new Map([
      [marker, JSON.stringify(artifact)],
      [upload, "bytes"],
    ]);
    const bucket = {
      download: async (path: string) => ({
        data: objects.has(path) ? new Blob([objects.get(path)!]) : null,
        error: null,
      }),
      copy: async (source: string, destination: string) => {
        // Another action deletes the release after publication's initial metadata read.
        if (withdraw && destination === archive)
          objects.set(
            marker,
            JSON.stringify({
              ...artifact,
              deletedAt: "2026-10-24T13:00:00Z",
              purgedAt: "2026-10-24T13:00:01Z",
            }),
          );
        objects.set(destination, objects.get(source)!);
        return { error: null };
      },
      upload: async (path: string, body: string) => {
        if (objects.has(path)) return { error: { statusCode: "409" } };
        objects.set(path, body);
        return { error: null };
      },
      remove: async (paths: string[]) => {
        paths.forEach((path) => objects.delete(path));
        return { error: null };
      },
    };
    const supabase = {
      storage: { from: () => bucket },
    } as unknown as SupabaseClient;
    const publication = publishArtifact(upload, { supabase });
    if (withdraw) {
      await expect(publication).rejects.toThrow("XRAG_PUBLISH_FAILED");
      expect(JSON.parse(objects.get(marker)!).purgedAt).toBeTruthy();
      expect(objects.has(archive)).toBe(false);
    } else {
      await expect(publication).resolves.toBe(artifact.id);
      expect(JSON.parse(objects.get(marker)!)).toEqual(artifact);
      expect(objects.has(archive)).toBe(true);
      expect(objects.has(upload)).toBe(false);
    }
    expect(
      [...objects.keys()].some((path) => path.startsWith("staging/")),
    ).toBe(false);
  },
);
