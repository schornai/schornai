import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { download } from "../external/downloads/src/util/download.ts";
import { replaceDirectory } from "../external/downloads/src/util/replaceDirectory.ts";
import { probeContains } from "../external/downloads/src/util/probeContains.ts";
import { downloadAll } from "../external/downloads/src/downloadAll.ts";
import { container } from "../external/downloads/src/container.ts";
import { ffmpeg } from "../external/downloads/src/ffmpeg.ts";
import { node } from "../external/downloads/src/node.ts";
import { ollama } from "../external/downloads/src/ollama.ts";

vi.mock("../external/downloads/src/container.ts", () => ({
  container: vi.fn(),
}));
vi.mock("../external/downloads/src/ffmpeg.ts", () => ({ ffmpeg: vi.fn() }));
vi.mock("../external/downloads/src/node.ts", () => ({ node: vi.fn() }));
vi.mock("../external/downloads/src/ollama.ts", () => ({ ollama: vi.fn() }));
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
async function directory() {
  const dir = await mkdtemp(join(tmpdir(), "external-download-test-"));
  directories.push(dir);
  return dir;
}
beforeEach(() => {
  for (const [name, action] of Object.entries({
    container,
    ffmpeg,
    node,
    ollama,
  }))
    vi.mocked(action).mockImplementation(async (target) => {
      await writeFile(join(target, name), `fresh ${name}`);
    });
});
it("refreshes every configured download and removes obsolete files", async () => {
  const root = await directory();
  const target = join(root, "dist");
  await mkdir(target);
  await writeFile(join(target, "obsolete"), "old");
  await downloadAll(target);
  expect((await readdir(target)).sort()).toEqual([
    "container",
    "ffmpeg",
    "node",
    "ollama",
  ]);
  await downloadAll(target);
  for (const action of [container, ffmpeg, node, ollama])
    expect(action).toHaveBeenCalledTimes(2);
  expect(await readdir(root)).toEqual(["dist"]);
});
it("retains the complete previous set if a later download or version probe fails", async () => {
  const root = await directory();
  const target = join(root, "dist");
  await mkdir(target);
  await writeFile(join(target, "node"), "old node");
  vi.mocked(ollama).mockRejectedValueOnce(new Error("version mismatch"));
  await expect(downloadAll(target)).rejects.toThrow("version mismatch");
  expect(await readdir(target)).toEqual(["node"]);
  expect(await readFile(join(target, "node"), "utf8")).toBe("old node");
  expect(await readdir(root)).toEqual(["dist"]);
});
it("does not publish partial first-time downloads", async () => {
  const root = await directory();
  await expect(
    replaceDirectory(join(root, "dist"), async (target) => {
      await writeFile(join(target, "partial"), "partial");
      throw new Error("interrupted");
    }),
  ).rejects.toThrow("interrupted");
  expect(await readdir(root)).toEqual([]);
});
it("downloads afresh and publishes only completed bodies", async () => {
  const root = await directory();
  const target = join(root, "binary");
  await writeFile(target, "stale");
  const fetchMock = vi
    .mocked(fetch)
    .mockResolvedValueOnce(new Response("current"));
  await download("https://download.test/versioned", target);
  expect(await readFile(target, "utf8")).toBe("current");
  expect(fetchMock).toHaveBeenCalledWith(
    "https://download.test/versioned",
    expect.objectContaining({
      cache: "no-store",
      signal: expect.any(AbortSignal),
    }),
  );
  expect(await readdir(root)).toEqual(["binary"]);
});
it.each(["http", "stream"])(
  "keeps the previous file and removes partial data after a %s failure",
  async (failure) => {
    const root = await directory();
    const target = join(root, "binary");
    await writeFile(target, "previous");
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("partial"));
      },
      pull(controller) {
        controller.error(new Error("connection lost"));
      },
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      failure === "http"
        ? new Response("unavailable", { status: 503 })
        : new Response(body),
    );
    await expect(
      download("https://download.test/versioned", target),
    ).rejects.toThrow();
    expect(await readFile(target, "utf8")).toBe("previous");
    expect(await readdir(root)).toEqual(["binary"]);
  },
);
it("checks version output written to stderr as well as stdout", async () => {
  await expect(
    probeContains("client 1.2.3", process.execPath, [
      "-e",
      "process.stderr.write('client 1.2.3')",
    ]),
  ).resolves.toBeUndefined();
});
it("downloads the exact pinned GitHub asset directly through the API", async () => {
  const root = await directory();
  const target = join(root, "binary");
  const mock = vi.mocked(fetch);
  mock.mockResolvedValueOnce(
    Response.json({
      assets: [
        { name: "another-platform", id: 10 },
        { name: "tool-arm64", id: 42 },
      ],
    }),
  );
  mock.mockResolvedValueOnce(new Response("complete binary"));
  await download(
    "https://github.com/owner/tool/releases/download/v1.2.3/tool-arm64",
    target,
  );
  expect(mock).toHaveBeenNthCalledWith(
    1,
    "https://api.github.com/repos/owner/tool/releases/tags/v1.2.3",
    expect.anything(),
  );
  expect(mock).toHaveBeenNthCalledWith(
    2,
    "https://api.github.com/repos/owner/tool/releases/assets/42",
    expect.objectContaining({
      headers: { Accept: "application/octet-stream" },
    }),
  );
  expect(await readFile(target, "utf8")).toBe("complete binary");
  expect(await readdir(root)).toEqual(["binary"]);
  expect(mock).toHaveBeenCalledTimes(2);
});
it("does not substitute a different GitHub release asset when the pinned one is missing", async () => {
  const root = await directory();
  const target = join(root, "binary");
  await writeFile(target, "previous");
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ assets: [{ name: "different", id: 42 }] }),
  );
  await expect(
    download("https://github.com/owner/tool/releases/download/v1/tool", target),
  ).rejects.toThrow("GitHub release asset missing");
  expect(await readFile(target, "utf8")).toBe("previous");
  expect(await readdir(root)).toEqual(["binary"]);
});
it("checks the downloaded Ollama client independently of a configured server", async () => {
  const root = await directory();
  const binary = join(root, "ollama");
  await writeFile(
    binary,
    '#!/bin/sh\nif [ "$OLLAMA_HOST" = "http://127.0.0.1:0" ]; then\n  echo "Warning: client version is 0.40.6" >&2\nelse\n  echo "ollama version is 0.40.6"\n  echo "Warning: client version is WRONG" >&2\nfi\n',
  );
  await chmod(binary, 0o755);
  const archive = join(root, "ollama.tgz");
  await promisify(execFile)("tar", ["-czf", archive, "-C", root, "ollama"]);
  vi.mocked(fetch)
    .mockResolvedValueOnce(
      Response.json({ assets: [{ name: "ollama-darwin.tgz", id: 42 }] }),
    )
    .mockResolvedValueOnce(new Response(await readFile(archive)));
  vi.stubEnv("OLLAMA_HOST", "http://remote.test:11434");
  const { ollama: actualOllama } = await vi.importActual<
    typeof import("../external/downloads/src/ollama.ts")
  >("../external/downloads/src/ollama.ts");
  await actualOllama(join(root, "downloads"));
  expect(process.env.OLLAMA_HOST).toBe("http://remote.test:11434");
});
