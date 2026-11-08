import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import {
  artifactLimits,
  cleanArtifactCache,
  downloadArtifact,
  requireArtifactSpace,
} from "../packages/service/src/artifactDownload.ts";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
const limits = {
  ...artifactLimits({} as any),
  minFreeBytes: 0,
  maxCacheBytes: 1024,
  idleTimeoutMs: 50,
};
const bytes = Buffer.from("a verified immutable artifact");
const artifact = {
  id: createHash("sha256").update(bytes).digest("hex"),
  size: bytes.length,
};
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "artifact-download-"));
  roots.push(root);
  const directory = await cleanArtifactCache(root, limits);
  const file = join(directory, `${artifact.id}.part`);
  const download = (overrides = {}) =>
    downloadArtifact(
      artifact,
      "https://sharing.test/archive",
      {},
      directory,
      { ...limits, ...overrides },
      new AbortController().signal,
    );
  return { root, directory, file, download };
}

it("resumes a durable prefix after a new synchronization and verifies the complete hash", async () => {
  const { file, download } = await fixture();
  await writeFile(file, bytes.subarray(0, 8));
  const fetch = vi.fn(async (_url, options) => {
    expect(options.headers.Range).toBe("bytes=8-");
    return new Response(bytes.subarray(8), {
      status: 206,
      headers: {
        "Content-Range": `bytes 8-${bytes.length - 1}/${bytes.length}`,
      },
    });
  });
  vi.stubGlobal("fetch", fetch);
  await expect(download()).resolves.toBe(file);
  expect(await readFile(file)).toEqual(bytes);
  await download();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("restarts safely when a legacy server ignores Range", async () => {
  const { file, download } = await fixture();
  await writeFile(file, bytes.subarray(0, 8));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(bytes)),
  );
  await download();
  expect(await readFile(file)).toEqual(bytes);
});

it.each(["bytes 0-28/29", "bytes 8-20/29", "bytes 8-28/100"])(
  "rejects inconsistent range %s without modifying the saved prefix",
  async (range) => {
    const { file, download } = await fixture();
    await writeFile(file, bytes.subarray(0, 8));
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(bytes.subarray(8), {
            status: 206,
            headers: { "Content-Range": range },
          }),
      ),
    );
    await expect(download()).rejects.toThrow("XRAG_INVALID_RANGE");
    expect(await readFile(file)).toEqual(bytes.subarray(0, 8));
  },
);

it("retains a truncated response and resumes it on retry", async () => {
  const { file, download } = await fixture();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(bytes.subarray(0, 8))),
  );
  await expect(download()).rejects.toThrow("XRAG_INCOMPLETE_DOWNLOAD");
  expect(await readFile(file)).toEqual(bytes.subarray(0, 8));
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(bytes.subarray(8), {
          status: 206,
          headers: {
            "Content-Range": `bytes 8-${bytes.length - 1}/${bytes.length}`,
          },
        }),
    ),
  );
  await download();
  expect(await readFile(file)).toEqual(bytes);
});

it.each(["checksum", "oversize"])("discards %s corruption", async (failure) => {
  const { file, download } = await fixture();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          Buffer.alloc(bytes.length + (failure === "oversize" ? 1 : 0)),
        ),
    ),
  );
  await expect(download()).rejects.toThrow(
    failure === "checksum" ? "XRAG_CHECKSUM_MISMATCH" : "XRAG_INVALID_LENGTH",
  );
  await expect(readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
});

it("rejects and removes a complete corrupt file left by a crash", async () => {
  const { file, download } = await fixture();
  await writeFile(file, Buffer.alloc(bytes.length));
  await expect(download()).rejects.toThrow("XRAG_CHECKSUM_MISMATCH");
  await expect(readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
  expect(fetch).not.toHaveBeenCalled();
});

it("fails before the transfer when the archive exceeds the cache budget or disk reserve", async () => {
  const { download } = await fixture();
  await expect(download({ maxCacheBytes: 1 })).rejects.toThrow(
    "XRAG_CACHE_LIMIT",
  );
  await expect(
    download({ minFreeBytes: Number.MAX_SAFE_INTEGER }),
  ).rejects.toThrow("XRAG_DISK_SPACE");
  expect(fetch).not.toHaveBeenCalled();
});

it("aborts a stalled response without discarding its resumable prefix", async () => {
  const { file, download } = await fixture();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(bytes.subarray(0, 8));
            },
          }),
        ),
    ),
  );
  await expect(download()).rejects.toThrow();
  expect(await readFile(file)).toEqual(bytes.subarray(0, 8));
});

it("cleans crash leftovers and expired downloads without following links or touching user data", async () => {
  const { root, directory, file } = await fixture();
  const userFile = join(root, "user-data");
  await writeFile(userFile, "keep");
  await symlink(userFile, join(directory, `${"a".repeat(64)}.part`));
  await mkdir(join(directory, "xrag-crashed"));
  await writeFile(
    join(directory, "xrag-crashed", "payload"),
    "partial extraction",
  );
  await mkdir(join(root, "cache", "xrag-legacy"));
  await writeFile(file, bytes.subarray(0, 8));
  const expired = join(directory, `${"b".repeat(64)}.part`);
  await writeFile(expired, bytes);
  await utimes(expired, new Date(0), new Date(0));
  await cleanArtifactCache(root, limits);
  expect(await readdir(directory)).toEqual([`${artifact.id}.part`]);
  expect(await readFile(userFile, "utf8")).toBe("keep");
  expect(await readdir(join(root, "cache"))).toEqual(["artifacts"]);
});

it("evicts old partials to reserve space but preserves the active download", async () => {
  const { directory, file } = await fixture();
  await writeFile(file, bytes.subarray(0, 8));
  const old = join(directory, `${"b".repeat(64)}.part`);
  await writeFile(old, Buffer.alloc(100));
  await requireArtifactSpace(
    directory,
    bytes.length - 8,
    { ...limits, maxCacheBytes: bytes.length },
    file,
  );
  expect(await readdir(directory)).toEqual([`${artifact.id}.part`]);
  await expect(
    requireArtifactSpace(
      directory,
      bytes.length,
      { ...limits, maxCacheBytes: bytes.length },
      file,
    ),
  ).rejects.toThrow("XRAG_CACHE_LIMIT");
});
