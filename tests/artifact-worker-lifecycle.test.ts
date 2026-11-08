import { expect, it, vi } from "vitest";
import { artifactPublicationWorker } from "../apps/realtime/src/artifacts/worker.ts";
const mocks = vi.hoisted(() => ({
  process: vi.fn(),
  cleanup: vi.fn(),
  announce: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock("@schornio/aibox-database/xrag/processArtifactPublication", () => ({
  processArtifactPublication: mocks.process,
}));
vi.mock("@schornio/aibox-database/xrag/cleanupArtifactPublications", () => ({
  cleanupArtifactPublications: mocks.cleanup,
}));
vi.mock("@schornio/aibox-database/xrag/announceArtifactPublications", () => ({
  announceArtifactPublications: mocks.announce,
}));
vi.mock(
  "@schornio/aibox-realtime/documents/artifactCatalog/ArtifactCatalogSession",
  () => ({
    ArtifactCatalogSession: class {
      announce = vi.fn();
      [Symbol.asyncDispose] = mocks.dispose;
    },
  }),
);
vi.mock(
  "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
vi.mock("@schornio/aibox-realtime/server/getRealtimeServerToken", () => ({
  getRealtimeServerToken: () => "worker",
}));
it("continues queued publications while cleanup and notification delivery fail", async () => {
  const controller = new AbortController();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.cleanup.mockRejectedValue(new Error("cleanup offline"));
  mocks.announce.mockRejectedValue(new Error("realtime offline"));
  mocks.process
    .mockResolvedValueOnce({ worked: true })
    .mockImplementationOnce(async () => {
      controller.abort();
      return { worked: false };
    });
  await artifactPublicationWorker({
    supabase: {} as any,
    signal: controller.signal,
  });
  expect(mocks.process).toHaveBeenCalledTimes(2);
  expect(mocks.dispose).toHaveBeenCalledOnce();
});
