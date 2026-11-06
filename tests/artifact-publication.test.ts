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

it.each([
  undefined,
  "staging-copy",
  "archive-copy",
  "marker-upload",
  "source-cleanup",
  "existing-corrupt",
  "existing-withdrawn",
  "archive-conflict",
])(
  "publishes a new immutable artifact or sanitizes failure at %s",
  async (failure) => {
    const marker = `catalog/${artifact.id}.json`;
    const archive = `artifacts/${artifact.id}.tar`;
    const objects = new Map<string, string>([["example.tar", "archive-bytes"]]);
    if (failure === "existing-corrupt") objects.set(marker, "invalid json");
    if (failure === "existing-withdrawn")
      objects.set(
        marker,
        JSON.stringify({ ...artifact, deletedAt: "2026-10-24T13:00:00Z" }),
      );
    const bucket = {
      download: vi.fn(async (path: string) => ({
        data: objects.has(path) ? new Blob([objects.get(path)!]) : null,
        error: null,
      })),
      copy: vi.fn(async (source: string, destination: string) => {
        if (
          (failure === "staging-copy" && destination.startsWith("staging/")) ||
          (failure === "archive-copy" && destination === archive)
        )
          return { error: { statusCode: "500" } };
        if (failure === "archive-conflict" && destination === archive)
          return { error: { statusCode: "409" } };
        objects.set(destination, objects.get(source)!);
        return { error: null };
      }),
      upload: vi.fn(async (path: string, body: string) => {
        if (failure === "marker-upload")
          return { error: { statusCode: "500" } };
        objects.set(path, body);
        return { error: null };
      }),
      remove: vi.fn(async (paths: string[]) => {
        if (failure === "source-cleanup" && paths.includes("example.tar"))
          return { error: { message: "private error details" } };
        for (const path of paths) objects.delete(path);
        return { error: null };
      }),
    };
    const operation = publishArtifact("example.tar", {
      supabase: { storage: { from: () => bucket } } as any,
    });
    if (!failure || failure === "archive-conflict") {
      await expect(operation).resolves.toBe(artifact.id);
      expect(JSON.parse(objects.get(marker)!)).toMatchObject({
        id: artifact.id,
        name: "example.tar",
      });
      expect(objects.has("example.tar")).toBe(false);
    } else {
      await expect(operation).rejects.toThrow(/^XRAG_PUBLISH_FAILED$/);
      expect(objects.has("example.tar")).toBe(true);
    }
    expect(bucket.remove).toHaveBeenLastCalledWith([
      expect.stringMatching(/^staging\//),
    ]);
    expect(
      [...objects.keys()].some((path) => path.startsWith("staging/")),
    ).toBe(false);
  },
);

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
