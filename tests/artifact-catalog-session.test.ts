import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Doc } from "yjs";
import { getArtifactLog } from "../packages/realtime/src/documents/artifactCatalog/_utils";
import { ArtifactCatalogSession } from "../packages/realtime/src/documents/artifactCatalog/ArtifactCatalogSession";

const boundary = vi.hoisted(() => ({
  publish: vi.fn(),
  remove: vi.fn(),
  get: vi.fn(),
  sync: vi.fn(),
  construct: vi.fn(),
}));
vi.mock("../packages/database/src/xrag/publishArtifact", () => ({
  publishArtifact: boundary.publish,
}));
vi.mock("../packages/database/src/xrag/deleteArtifact", () => ({
  deleteArtifact: boundary.remove,
}));
vi.mock("../packages/database/src/xrag/getArtifact", () => ({
  getArtifact: boundary.get,
}));
vi.mock("../packages/realtime/src/server/ServerRealtimeProvider", () => ({
  ServerRealtimeProvider: class {
    document = new Doc();
    waitForSynced = boundary.sync;
    constructor(options: unknown) {
      boundary.construct(options);
    }
  },
}));
const artifact = {
  id: "a".repeat(64),
  name: "setup.tar",
  size: 123,
  createdAt: "2026-11-07T12:00:00Z",
  xrag: { xrag_version: 1, xrag_type: "setup" },
};
let session: ArtifactCatalogSession;
const options = { supabase: {} } as any;
beforeEach(() => {
  vi.resetAllMocks();
  boundary.sync.mockResolvedValue(undefined);
  session = new ArtifactCatalogSession({
    serverToken: "token",
    websocketProvider: {},
  } as any);
});
afterEach(() => session.document.destroy());

it("queues without a realtime dependency, then separately announces completed publication", async () => {
  const calls: string[] = [];
  boundary.sync.mockImplementation(async () => {
    calls.push("sync");
  });
  boundary.publish.mockImplementation(async () => {
    calls.push("publish");
    return artifact.id;
  });
  boundary.get.mockImplementation(async () => {
    calls.push("get");
    return artifact;
  });
  expect(boundary.construct).toHaveBeenCalledWith(
    expect.objectContaining({ documentName: "artifactCatalog" }),
  );
  await expect(session.publish("upload.tar", options)).resolves.toBe(
    artifact.id,
  );
  expect(calls).toEqual(["publish"]);
  await session.announce(artifact.id, options);
  expect(calls).toEqual(["publish", "sync", "get", "sync"]);
  expect(boundary.publish).toHaveBeenCalledWith("upload.tar", options);
  expect(boundary.get).toHaveBeenCalledWith(artifact.id, options);
  expect(getArtifactLog(session.document).toArray()).toEqual([
    expect.objectContaining({ operation: "created", artifact }),
  ]);
  expect(boundary.sync.mock.calls[0][0].abortSignal).toBeInstanceOf(
    AbortSignal,
  );
});

it("broadcasts successful deletion before completing", async () => {
  const deleted = { ...artifact, deletedAt: "2026-11-07T13:00:00Z" };
  boundary.remove.mockResolvedValue(deleted);
  await session.remove(artifact.id, options);
  expect(boundary.remove).toHaveBeenCalledWith(artifact.id, options);
  expect(boundary.sync).toHaveBeenCalledTimes(2);
  expect(getArtifactLog(session.document).toArray()[0]).toMatchObject({
    operation: "removed",
    artifact: deleted,
  });
});

it.each(["withdrawn", "missing", "unavailable"])(
  "preserves the purge error while broadcasting recovery state: %s",
  async (state) => {
    const failure = new Error("purge failed");
    boundary.remove.mockRejectedValue(failure);
    const current = { ...artifact, deletedAt: "2026-11-07T13:00:00Z" };
    if (state === "unavailable")
      boundary.get.mockRejectedValue(new Error("lookup failed"));
    else
      boundary.get.mockResolvedValue(
        state === "withdrawn" ? current : undefined,
      );
    await expect(session.remove(artifact.id, options)).rejects.toBe(failure);
    expect(boundary.get).toHaveBeenCalledWith(artifact.id, options);
    const entries = getArtifactLog(session.document).toArray();
    expect(entries).toHaveLength(state === "withdrawn" ? 1 : 0);
    if (state === "withdrawn")
      expect(entries[0]).toMatchObject({
        operation: "removed",
        artifact: current,
      });
  },
);

it.each(["announce", "remove"] as const)(
  "does not %s before synchronization succeeds",
  async (operation) => {
    boundary.sync.mockRejectedValue(new Error("sync timeout"));
    await expect(session[operation](artifact.id, options)).rejects.toThrow(
      "sync timeout",
    );
    expect(boundary.publish).not.toHaveBeenCalled();
    expect(boundary.remove).not.toHaveBeenCalled();
    expect(getArtifactLog(session.document).length).toBe(0);
  },
);
