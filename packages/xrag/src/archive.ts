import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  lstat,
  mkdir,
  readdir,
  readlink,
  realpath,
  symlink,
  unlink,
} from "node:fs/promises";
import { join, posix } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Parser, x } from "tar";
import { xragSchema } from "./schema.ts";

export function archivePath(value: string) {
  if (
    value.includes("\\") ||
    value.startsWith("/") ||
    /^[A-Za-z]:/.test(value) ||
    value.split("/").includes("..")
  ) {
    throw new Error("XRAG_UNSAFE_PATH");
  }
  return posix.normalize(value).replace(/^\.\//, "");
}

type ArchiveLink = { target: string; hard: boolean };

function assertRelativeLink(target: string) {
  if (
    !target ||
    target.startsWith("/") ||
    target.includes("\\") ||
    /^[A-Za-z]:/.test(target)
  )
    throw new Error("XRAG_UNSAFE_LINK");
}

async function assertSafeLink(
  name: string,
  link: ArchiveLink,
  lookup: (
    name: string,
  ) => ArchiveLink | undefined | Promise<ArchiveLink | undefined>,
) {
  assertRelativeLink(link.target);
  const resolved = link.hard
    ? []
    : posix
        .dirname(name)
        .split("/")
        .filter((part) => part !== ".");
  const pending = link.target.split("/");
  let hops = 0;
  while (pending.length) {
    const part = pending.shift()!;
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!resolved.length) throw new Error("XRAG_UNSAFE_LINK");
      resolved.pop();
      continue;
    }
    const nested = await lookup([...resolved, part].join("/"));
    if (nested) {
      assertRelativeLink(nested.target);
      if (++hops > 40) throw new Error("XRAG_UNSAFE_LINK");
      if (nested.hard) resolved.length = 0;
      pending.unshift(...nested.target.split("/"));
    } else resolved.push(part);
  }
}

/** Stream even very large archives; only small metadata files are held in memory. */
export async function inspectArchive(
  source: AsyncIterable<Uint8Array>,
  signal?: AbortSignal,
) {
  const hash = createHash("sha256");
  let size = 0;
  const metadata = new Map<string, Buffer>();
  const selected = new Set([
    "xrag.json",
    "description.md",
    "image.png",
    "image.jpg",
    "image.gif",
    "image.webp",
  ]);
  const names = new Set<string>();
  const links = new Map<string, ArchiveLink>();
  const files = new Set<string>();
  let invalid: Error | undefined;
  const parser = new Parser({
    strict: true,
    onReadEntry(entry) {
      try {
        const name = archivePath(entry.path);
        if (names.has(name) && entry.type !== "Directory")
          throw new Error("XRAG_DUPLICATE_ENTRY");
        names.add(name);
        if (entry.type === "SymbolicLink" || entry.type === "Link") {
          const target = entry.linkpath ?? "";
          assertRelativeLink(target);
          archivePath(
            posix.normalize(
              posix.join(
                entry.type === "Link" ? "." : posix.dirname(name),
                target,
              ),
            ),
          );
          links.set(name, { target, hard: entry.type === "Link" });
        } else if (
          !["File", "Directory", "OldFile", "ContiguousFile"].includes(
            entry.type,
          )
        ) {
          throw new Error("XRAG_UNSUPPORTED_ENTRY");
        }
        if (["File", "OldFile", "ContiguousFile"].includes(entry.type))
          files.add(name);
        if (selected.has(name)) {
          if (
            entry.type !== "File" ||
            entry.size > (name.startsWith("image.") ? 5_000_000 : 256_000)
          )
            throw new Error("XRAG_INVALID_METADATA");
          const chunks: Buffer[] = [];
          entry.on("data", (chunk: Buffer) => chunks.push(chunk));
          entry.on("end", () => metadata.set(name, Buffer.concat(chunks)));
        }
      } catch (error) {
        invalid = error as Error;
      }
      entry.resume();
    },
  });
  const digest = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length;
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  await pipeline(source, digest, parser, { signal });
  if (invalid) throw invalid;
  // No entry may write through an archive symlink, including links encountered later.
  for (const name of names) {
    let parent = posix.dirname(name);
    while (parent !== ".") {
      if (links.has(parent)) throw new Error("XRAG_LINK_PARENT");
      parent = posix.dirname(parent);
    }
  }
  // Resolve links component by component: normalizing "link/../x" first can hide
  // an escape when that intermediate link points at an ancestor directory.
  for (const [name, link] of links)
    await assertSafeLink(name, link, (path) => links.get(path));
  const xrag = xragSchema.parse(
    JSON.parse(metadata.get("xrag.json")?.toString("utf8") ?? "null"),
  );
  const required =
    xrag.xrag_type === "setup"
      ? ["setup.sh", "update.mts", "apps/service/cli.mjs"]
      : xrag.xrag_type === "mlxWhisperModel"
        ? ["config.json", "weights.npz"]
        : xrag.xrag_type === "ollamaModel"
          ? ["manifest.json"]
          : xrag.xrag_type === "certificate"
            ? ["privkey.pem", "fullkey.pem"]
            : [];
  if (required.some((name) => !files.has(name)))
    throw new Error("XRAG_MISSING_PAYLOAD");
  return { id: hash.digest("hex"), size, xrag, metadata, links };
}

/** Extract only into a fresh, private directory owned by the caller. */
export async function extractArchive(
  file: string,
  destination: string,
  expectedId: string,
  signal?: AbortSignal,
) {
  if (!(await lstat(destination)).isDirectory())
    throw new Error("XRAG_UNSAFE_DESTINATION");
  if ((await readdir(destination)).length)
    throw new Error("XRAG_DESTINATION_NOT_EMPTY");
  const root = await realpath(destination);
  const result = await inspectArchive(createReadStream(file), signal);
  if (result.id !== expectedId) throw new Error("XRAG_CHECKSUM_MISMATCH");
  signal?.throwIfAborted();
  let extractionError: Error | undefined;
  await x({
    file,
    cwd: root,
    // tar's strict mode rejects while other entries are still being written.
    // Keep warnings fatal, but wait for those writes before callers clean up.
    strict: false,
    onwarn(code, message, data) {
      extractionError ??= Object.assign(new Error(`${code}: ${message}`), data);
    },
    preservePaths: false,
    noChmod: false,
    noMtime: true,
    // tar rejects even validated in-tree symlink chains. Install these last,
    // unchanged, so extraction never writes through an archive symlink.
    filter: (_path, entry) =>
      !("type" in entry && entry.type === "SymbolicLink"),
  });
  if (extractionError) throw extractionError;
  signal?.throwIfAborted();
  const created: string[] = [];
  try {
    for (const [name, link] of result.links) {
      if (link.hard) continue;
      signal?.throwIfAborted();
      let parent = root;
      for (const part of posix.dirname(name).split("/")) {
        if (part === ".") continue;
        parent = join(parent, part);
        await mkdir(parent).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "EEXIST") throw error;
        });
        if (!(await lstat(parent)).isDirectory())
          throw new Error("XRAG_LINK_PARENT");
      }
      const path = join(root, name);
      await symlink(link.target, path);
      created.push(path);
    }
    // Check actual filesystem resolution too: case/Unicode aliases can make
    // distinct archive names refer to the same path on macOS.
    for (const [name, link] of result.links) {
      if (link.hard) continue;
      signal?.throwIfAborted();
      await assertSafeLink(name, link, async (path) => {
        try {
          if (!(await lstat(join(root, path))).isSymbolicLink()) return;
          return { target: await readlink(join(root, path)), hard: false };
        } catch (error) {
          if (
            ["ENOENT", "ENOTDIR"].includes(
              (error as NodeJS.ErrnoException).code ?? "",
            )
          )
            return;
          throw error;
        }
      });
    }
  } catch (error) {
    await Promise.allSettled(created.map((path) => unlink(path)));
    throw error;
  }
  return result;
}
