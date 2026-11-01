import { EventEmitter } from "node:events";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  serverConfig: undefined as any,
  listen: vi.fn(),
  chat: vi.fn(),
  generate: vi.fn(),
  stream: vi.fn(),
  embed: vi.fn(),
  files: vi.fn(),
  transcribe: vi.fn(),
  spawn: vi.fn(),
  mkdir: vi.fn(),
  watchModels: vi.fn(),
}));
vi.mock("@hocuspocus/server", () => ({
  Server: class {
    constructor(config: any) {
      mocks.serverConfig = config;
    }
    listen = mocks.listen;
  },
}));
vi.mock("@schornio/aibox-database/_util/createSupabaseClient", () => ({
  createSupabaseClient: () => ({ service: true }),
}));
vi.mock("@schornio/aibox-realtime/_lib/createSupabaseExtension", () => ({
  createSupabaseExtension: (options: any) => options,
}));
vi.mock("../apps/realtime/src/chat/worker", () => ({ chatWorker: mocks.chat }));
vi.mock("../apps/realtime/src/modelDoGenerate/worker", () => ({
  modelDoGenerateWorker: mocks.generate,
}));
vi.mock("../apps/realtime/src/modelDoStream/worker", () => ({
  modelDoStreamWorker: mocks.stream,
}));
vi.mock("../apps/realtime/src/modelDoEmbed/worker", () => ({
  modelDoEmbedWorker: mocks.embed,
}));
vi.mock("../apps/realtime/src/processFile/worker", () => ({
  processFileWorker: mocks.files,
}));
vi.mock("../apps/transcriber-mac/src/service/transcribeWorker", () => ({
  transcribeWorker: mocks.transcribe,
}));
vi.mock("../apps/realtime/src/_utils/watchOllamaModels", () => ({
  watchOllamaModels: mocks.watchModels,
}));
vi.mock("node:child_process", () => ({ spawn: mocks.spawn }));
vi.mock("node:fs/promises", () => ({ mkdir: mocks.mkdir }));
beforeEach(() => {
  vi.resetModules();
  for (const mock of Object.values(mocks))
    if (vi.isMockFunction(mock)) mock.mockReset();
  for (const worker of [
    mocks.chat,
    mocks.generate,
    mocks.stream,
    mocks.embed,
    mocks.files,
    mocks.transcribe,
  ])
    worker.mockResolvedValue(undefined);
  mocks.listen.mockResolvedValue(undefined);
  mocks.mkdir.mockResolvedValue(undefined);
  mocks.watchModels.mockReturnValue(new Promise(() => {}));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
describe("application startup and Python packaging", () => {
  it.each([undefined, "9010"])(
    "starts realtime and its workers at port %s",
    async (port) => {
      if (port) vi.stubEnv("PORT", port);
      else vi.stubEnv("PORT", undefined);
      await import("../apps/realtime/server");
      expect(mocks.serverConfig.port).toBe(port ? 9010 : 9000);
      expect(mocks.listen).toHaveBeenCalledOnce();
      for (const worker of [
        mocks.chat,
        mocks.generate,
        mocks.stream,
        mocks.embed,
        mocks.files,
      ])
        expect(worker).toHaveBeenCalledWith(
          expect.objectContaining({ workerIdentifier: expect.any(String) }),
        );
    },
  );
  it.each([undefined, "/mounted/ollama/models"])(
    "watches the Box model directory or explicit override %s",
    async (directory) => {
      vi.stubEnv("OLLAMA_MODELS", directory);
      await import("../apps/realtime/server");
      expect(mocks.watchModels).toHaveBeenCalledWith(
        expect.objectContaining({
          directory: directory ?? join(homedir(), ".aibox/ollama/models"),
        }),
      );
      const changes = mocks.watchModels.mock.lastCall![0].changes;
      for (const worker of [
        mocks.generate,
        mocks.stream,
        mocks.embed,
        mocks.files,
      ]) {
        expect(worker.mock.lastCall![0].capabilitiesChanged).toBe(changes);
      }
    },
  );
  it("reports watcher failures instead of silently losing model updates", async () => {
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    mocks.watchModels.mockRejectedValue(new Error("watch failed"));
    await import("../apps/realtime/server");
    expect(exit).toHaveBeenCalledWith(1);
  });
  it("reports server bind failures with a nonzero exit status", async () => {
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    mocks.listen.mockRejectedValue(new Error("port busy"));
    await import("../apps/realtime/server");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(exit).toHaveBeenCalledWith(1);
  });
  it("starts the macOS transcription worker", async () => {
    vi.stubEnv("WORKER_IDENTIFIER", "machine-one:transcriber");
    await import("../apps/transcriber-mac/server");
    expect(mocks.transcribe).toHaveBeenCalledWith(
      expect.objectContaining({ workerIdentifier: "machine-one:transcriber" }),
    );
  });
  it.each([0, 1])(
    "packages the Python interface and handles exit code %s",
    async (code) => {
      const child = Object.assign(new EventEmitter(), {
        stdout: { pipe: vi.fn() },
        stderr: { pipe: vi.fn() },
        spawnargs: ["pyinstaller"],
      });
      mocks.spawn.mockImplementation(() => {
        setTimeout(() => child.emit("close", code), 0);
        return child;
      });
      const exit = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);
      await import("../apps/transcriber-mac/src/bundlePython");
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mocks.mkdir).toHaveBeenCalledWith("./dist/.buildArtifacts", {
        recursive: true,
      });
      expect(mocks.spawn.mock.lastCall![1]).toEqual(
        expect.arrayContaining([
          "--hidden-import",
          "mlx_whisper",
          "--onedir",
          "transcribe-worker",
        ]),
      );
      expect(exit).toHaveBeenCalledTimes(code === 0 ? 0 : 1);
    },
  );
});
