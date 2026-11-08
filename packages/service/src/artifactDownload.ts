import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { lstat, mkdir, readdir, rm, statfs, utimes } from "node:fs/promises";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Artifact } from "xrag/schema";
import type { ServiceConfig } from "./config.ts";

export function artifactLimits(config: ServiceConfig) {
  return (
    config.artifacts ?? {
      maxCacheBytes: 500 * 1024 ** 3,
      minFreeBytes: 5 * 1024 ** 3,
      maxExtractedBytes: 400 * 1024 ** 3,
      maxEntries: 1_000_000,
      retentionHours: 72,
      idleTimeoutMs: 120_000,
    }
  );
}
type Limits = ReturnType<typeof artifactLimits>;

/** The daemon lock and serial synchronization queue own this private directory.
 * Never follow symlinks, and never clean application data or another cache.
 */
export async function cleanArtifactCache(root: string, limits: Limits) {
  const cache = join(root, "cache");
  await mkdir(cache, { recursive: true, mode: 0o700 });
  // Pre-resume releases left random working directories after process death.
  for (const entry of await readdir(cache, { withFileTypes: true })) {
    if (entry.name.startsWith("xrag-"))
      await rm(join(cache, entry.name), { recursive: true, force: true });
  }
  const directory = join(cache, "artifacts");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const retained: { path: string; size: number; time: number }[] = [];
  for (const name of await readdir(directory)) {
    const path = join(directory, name);
    const entry = await lstat(path);
    if (
      !/^[a-f0-9]{64}\.part$/.test(name) ||
      !entry.isFile() ||
      Date.now() - entry.mtimeMs > limits.retentionHours * 3_600_000
    ) {
      await rm(path, { recursive: true, force: true });
    } else retained.push({ path, size: entry.size, time: entry.mtimeMs });
  }
  let size = retained.reduce((sum, entry) => sum + entry.size, 0);
  for (const entry of retained.sort((a, b) => a.time - b.time)) {
    if (size <= limits.maxCacheBytes) break;
    await rm(entry.path, { force: true });
    size -= entry.size;
  }
  return directory;
}

export async function requireArtifactSpace(
  directory: string,
  additionalBytes: number,
  limits: Limits,
  keep?: string,
  workingBytes = 0,
) {
  if (!Number.isSafeInteger(additionalBytes) || additionalBytes < 0)
    throw new Error("XRAG_INVALID_SIZE");
  const entries = await Promise.all(
    (await readdir(directory)).map(async (name) => {
      const path = join(directory, name);
      const stat = await lstat(path);
      return { path, stat };
    }),
  );
  // Payloads are accounted for by callers as a reservation before extraction.
  let used =
    workingBytes +
    entries.reduce((sum, { stat }) => sum + (stat.isFile() ? stat.size : 0), 0);
  let disk = await statfs(directory);
  let free = disk.bavail * disk.bsize;
  for (const { path, stat } of entries.sort(
    (a, b) => a.stat.mtimeMs - b.stat.mtimeMs,
  )) {
    if (
      used + additionalBytes <= limits.maxCacheBytes &&
      free >= additionalBytes + limits.minFreeBytes
    )
      break;
    if (path === keep || !stat.isFile() || !path.endsWith(".part")) continue;
    await rm(path, { force: true });
    used -= stat.size;
    disk = await statfs(directory);
    free = disk.bavail * disk.bsize;
  }
  if (used + additionalBytes > limits.maxCacheBytes)
    throw new Error("XRAG_CACHE_LIMIT");
  if (free < additionalBytes + limits.minFreeBytes)
    throw new Error("XRAG_DISK_SPACE");
}

/** Resume bytes by immutable digest. Only a complete SHA-256 match is returned.
 * Transport interruptions retain a bounded partial; corrupt bytes are discarded.
 */
export async function downloadArtifact(
  artifact: Pick<Artifact, "id" | "size">,
  url: string,
  headers: Record<string, string>,
  directory: string,
  limits: Limits,
  signal: AbortSignal,
  workingBytes = 0,
) {
  if (
    !/^[a-f0-9]{64}$/.test(artifact.id) ||
    !Number.isSafeInteger(artifact.size) ||
    artifact.size <= 0
  )
    throw new Error("XRAG_INVALID_SIZE");
  const file = join(directory, `${artifact.id}.part`);
  let offset = 0;
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.size > artifact.size) {
      await rm(file, { recursive: true, force: true });
    } else offset = stat.size;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await requireArtifactSpace(
    directory,
    artifact.size - offset,
    limits,
    file,
    workingBytes,
  );
  const hash = createHash("sha256");
  if (offset) {
    for await (const chunk of createReadStream(file, { signal }))
      hash.update(chunk);
  }
  if (offset < artifact.size) {
    const idle = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const touch = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => idle.abort(new Error("XRAG_DOWNLOAD_IDLE")),
        limits.idleTimeoutMs,
      );
    };
    const transferSignal = AbortSignal.any([signal, idle.signal]);
    let response: Response | undefined;
    let corrupt = false;
    try {
      touch();
      response = await fetch(url, {
        headers: {
          ...headers,
          ...(offset ? { Range: `bytes=${offset}-` } : {}),
        },
        redirect: "error",
        signal: transferSignal,
      });
      if (!response.ok || !response.body)
        throw new Error(`Download failed (HTTP ${response.status})`);
      if (offset && response.status === 200) {
        // Older servers may ignore Range. Restart safely instead of appending.
        offset = 0;
      } else if (response.status === 206) {
        if (
          response.headers.get("content-range") !==
          `bytes ${offset}-${artifact.size - 1}/${artifact.size}`
        )
          throw new Error("XRAG_INVALID_RANGE");
      } else if (response.status !== 200) throw new Error("XRAG_INVALID_RANGE");
      const length = response.headers.get("content-length");
      if (length !== null && Number(length) !== artifact.size - offset)
        throw new Error("XRAG_INVALID_LENGTH");
      const digest = offset ? hash : createHash("sha256");
      let received = offset;
      let checked = offset;
      const guard = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          touch();
          received += chunk.length;
          if (received > artifact.size) {
            corrupt = true;
            callback(new Error("XRAG_INVALID_LENGTH"));
            return;
          }
          digest.update(chunk);
          // Check available space periodically as unrelated writers may consume it.
          if (received - checked >= 16 * 1024 ** 2) {
            checked = received;
            statfs(directory).then((disk) => {
              if (disk.bavail * disk.bsize < limits.minFreeBytes + chunk.length)
                callback(new Error("XRAG_DISK_SPACE"));
              else callback(null, chunk);
            }, callback);
          } else callback(null, chunk);
        },
      });
      await pipeline(
        Readable.fromWeb(
          response.body as import("node:stream/web").ReadableStream,
          { signal: transferSignal },
        ),
        guard,
        createWriteStream(file, { flags: offset ? "a" : "w", mode: 0o600 }),
        { signal: transferSignal },
      );
      if (received !== artifact.size)
        throw new Error("XRAG_INCOMPLETE_DOWNLOAD");
      if (digest.digest("hex") !== artifact.id) {
        corrupt = true;
        throw new Error("XRAG_CHECKSUM_MISMATCH");
      }
    } catch (error) {
      if (corrupt) await rm(file, { force: true });
      throw error;
    } finally {
      clearTimeout(timer!);
      await response?.body?.cancel().catch(() => {});
    }
  } else if (hash.digest("hex") !== artifact.id) {
    await rm(file, { force: true });
    throw new Error("XRAG_CHECKSUM_MISMATCH");
  }
  const now = new Date();
  await utimes(file, now, now);
  return file;
}
