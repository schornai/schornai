import { Header } from "tar";
import { createReadStream, createWriteStream } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { afterEach, expect, it } from "vitest";
import {
  extractArchive,
  inspectArchive,
} from "../packages/xrag/src/archive.ts";

function tar(
  entries: {
    path: string;
    body?: string;
    type?: "File" | "SymbolicLink" | "Link" | "Directory" | "FIFO";
    linkpath?: string;
  }[],
) {
  const chunks: Buffer[] = [];
  for (const entry of entries) {
    const body = Buffer.from(entry.body ?? "");
    const header = new Header({
      path: entry.path,
      mode: 0o644,
      size: body.length,
      type: entry.type ?? "File",
      linkpath: entry.linkpath,
    });
    header.encode();
    chunks.push(
      header.block!,
      body,
      Buffer.alloc((512 - (body.length % 512)) % 512),
    );
  }
  chunks.push(Buffer.alloc(1024));
  return Readable.from(Buffer.concat(chunks));
}
const metadata = {
  path: "xrag.json",
  body: JSON.stringify({
    xrag_version: 1,
    xrag_type: "files",
    name: "dictionary",
    targets: ["transcriber-mlx"],
  }),
};
const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true, maxRetries: 3 });
});

async function extractionFixture(entries: Parameters<typeof tar>[0]) {
  const directory = await mkdtemp(join(tmpdir(), "xrag-extraction-test-"));
  directories.push(directory);
  const file = join(directory, "archive.tar");
  const destination = join(directory, "payload");
  await mkdir(destination);
  await pipeline(tar([metadata, ...entries]), createWriteStream(file));
  const { id } = await inspectArchive(createReadStream(file));
  return { directory, file, destination, id };
}

it.each([false, true])(
  "extracts Ollama symlink chains unchanged (reverse order: %s)",
  async (reverse) => {
    const links: Parameters<typeof tar>[0] = [
      {
        path: "bin/ollama/libmtmd.0.dylib",
        type: "SymbolicLink",
        linkpath: "libmtmd.0.0.0.dylib",
      },
      {
        path: "bin/ollama/libmtmd.dylib",
        type: "SymbolicLink",
        linkpath: "libmtmd.0.dylib",
      },
    ];
    const { file, destination, id } = await extractionFixture([
      { path: "bin/ollama/libmtmd.0.0.0.dylib", body: "library" },
      ...(reverse ? links.reverse() : links),
    ]);
    await extractArchive(file, destination, id);
    expect(await readlink(join(destination, "bin/ollama/libmtmd.dylib"))).toBe(
      "libmtmd.0.dylib",
    );
    expect(
      await readlink(join(destination, "bin/ollama/libmtmd.0.dylib")),
    ).toBe("libmtmd.0.0.0.dylib");
    expect(
      await readFile(join(destination, "bin/ollama/libmtmd.dylib"), "utf8"),
    ).toBe("library");
  },
);

it("extracts framework links through directory aliases and preserves hard links", async () => {
  const { file, destination, id } = await extractionFixture([
    { path: "App/Versions/A/Resources/info", body: "framework" },
    { path: "App/Versions/Current", type: "SymbolicLink", linkpath: "A" },
    {
      path: "App/Resources",
      type: "SymbolicLink",
      linkpath: "Versions/Current/Resources",
    },
    { path: "App/Info", type: "SymbolicLink", linkpath: "Resources/info" },
    {
      path: "info-copy",
      type: "Link",
      linkpath: "App/Versions/A/Resources/info",
    },
  ]);
  await extractArchive(file, destination, id);
  expect(await readlink(join(destination, "App/Resources"))).toBe(
    "Versions/Current/Resources",
  );
  expect(await readFile(join(destination, "App/Info"), "utf8")).toBe(
    "framework",
  );
  expect((await stat(join(destination, "info-copy"))).ino).toBe(
    (await stat(join(destination, "App/Versions/A/Resources/info"))).ino,
  );
});

it("requires an empty real destination and leaves pre-existing data intact", async () => {
  const { directory, file, destination, id } = await extractionFixture([
    { path: "data", body: "new" },
  ]);
  await writeFile(join(destination, "data"), "keep");
  await expect(extractArchive(file, destination, id)).rejects.toThrow(
    "XRAG_DESTINATION_NOT_EMPTY",
  );
  expect(await readFile(join(destination, "data"), "utf8")).toBe("keep");
  const alias = join(directory, "alias");
  await symlink(destination, alias);
  await expect(extractArchive(file, alias, id)).rejects.toThrow(
    "XRAG_UNSAFE_DESTINATION",
  );
});

it("rejects a checksum mismatch before extracting any files", async () => {
  const { file, destination } = await extractionFixture([
    { path: "data", body: "new" },
  ]);
  await expect(extractArchive(file, destination, "wrong")).rejects.toThrow(
    "XRAG_CHECKSUM_MISMATCH",
  );
  await expect(stat(join(destination, "data"))).rejects.toMatchObject({
    code: "ENOENT",
  });
});

it("waits for file writes before reporting an extraction error", async () => {
  const { file, destination, id } = await extractionFixture([
    { path: "missing-link", type: "Link", linkpath: "not-in-archive" },
    ...Array.from({ length: 20 }, (_, index) => ({
      path: `remaining/${index}/data`,
      body: "x".repeat(64 * 1024),
    })),
  ]);
  await expect(extractArchive(file, destination, id)).rejects.toMatchObject({
    code: "ENOENT",
  });
  expect(
    await readFile(join(destination, "remaining/19/data"), "utf8"),
  ).toHaveLength(64 * 1024);
  await rm(destination, { recursive: true });
});

it("rejects symlink escapes caused by filesystem case aliases", async (context) => {
  const { directory, file, destination, id } = await extractionFixture([
    { path: "Ancestor", type: "SymbolicLink", linkpath: "." },
    { path: "escape", type: "SymbolicLink", linkpath: "ancestor/../outside" },
  ]);
  await writeFile(join(directory, "CaseProbe"), "probe");
  if (!(await stat(join(directory, "caseprobe")).catch(() => undefined))) {
    context.skip();
    return;
  }
  await expect(extractArchive(file, destination, id)).rejects.toThrow(
    "XRAG_UNSAFE_LINK",
  );
  expect(await readdir(destination)).toEqual(["xrag.json"]);
});

it("rejects writes below a symlink even when filesystem case differs", async (context) => {
  const { directory, file, destination, id } = await extractionFixture([
    { path: "Parent", type: "SymbolicLink", linkpath: "." },
    { path: "parent/child", type: "SymbolicLink", linkpath: "../xrag.json" },
  ]);
  await writeFile(join(directory, "CaseProbe"), "probe");
  if (!(await stat(join(directory, "caseprobe")).catch(() => undefined))) {
    context.skip();
    return;
  }
  await expect(extractArchive(file, destination, id)).rejects.toThrow(
    "XRAG_LINK_PARENT",
  );
  expect(await readdir(destination)).toEqual(["xrag.json"]);
});
it("inspects an archive as a stream and hashes the actual bytes", async () => {
  const result = await inspectArchive(
    tar([metadata, { path: "data.txt", body: "hello" }]),
  );
  expect(result.id).toMatch(/^[0-9a-f]{64}$/);
  expect(result.xrag.xrag_type).toBe("files");
  expect(result.metadata.size).toBe(1);
});
it.each([
  "../outside",
  "/tmp/outside",
  "a/../../outside",
  "C:/outside",
  "a\\outside",
])("rejects unsafe archive entry %s", async (path) => {
  await expect(
    inspectArchive(tar([metadata, { path, body: "bad" }])),
  ).rejects.toThrow("XRAG_UNSAFE_PATH");
});
it("rejects duplicate metadata and writes through symlink parents", async () => {
  await expect(inspectArchive(tar([metadata, metadata]))).rejects.toThrow(
    "XRAG_DUPLICATE_ENTRY",
  );
  await expect(
    inspectArchive(
      tar([
        metadata,
        { path: "data", type: "SymbolicLink", linkpath: "safe" },
        { path: "data/inside", body: "bad" },
      ]),
    ),
  ).rejects.toThrow("XRAG_LINK_PARENT");
});
it("rejects archives missing weights and old setup bundles that cannot update the service", async () => {
  await expect(
    inspectArchive(
      tar([
        {
          path: "xrag.json",
          body: JSON.stringify({ xrag_version: 1, xrag_type: "setup" }),
        },
      ]),
    ),
  ).rejects.toThrow("XRAG_MISSING_PAYLOAD");
});
it("allows relative in-tree symlinks needed by packaged macOS applications", async () => {
  await expect(
    inspectArchive(
      tar([
        metadata,
        { path: "App/Versions/Current", type: "SymbolicLink", linkpath: "A" },
        {
          path: "App/Resources",
          type: "SymbolicLink",
          linkpath: "Versions/Current/Resources",
        },
      ]),
    ),
  ).resolves.toHaveProperty("xrag.xrag_type", "files");
});
it("rejects chained symlinks that escape after resolving an intermediate ancestor link", async () => {
  await expect(
    inspectArchive(
      tar([
        metadata,
        { path: "ancestor", type: "SymbolicLink", linkpath: "." },
        {
          path: "escape",
          type: "SymbolicLink",
          linkpath: "ancestor/../outside",
        },
      ]),
    ),
  ).rejects.toThrow("XRAG_UNSAFE_LINK");
});

it.each(["", "/absolute", "C:/windows", "back\\slash"])(
  "rejects unsafe link targets (%s)",
  async (linkpath) => {
    await expect(
      inspectArchive(
        tar([metadata, { path: "link", type: "SymbolicLink", linkpath }]),
      ),
    ).rejects.toThrow(linkpath ? "XRAG_UNSAFE_LINK" : "TAR_ENTRY_INVALID");
  },
);

it("rejects symlink cycles and unsupported device-like entries", async () => {
  await expect(
    inspectArchive(
      tar([
        metadata,
        { path: "a", type: "SymbolicLink", linkpath: "b" },
        { path: "b", type: "SymbolicLink", linkpath: "a" },
      ]),
    ),
  ).rejects.toThrow("XRAG_UNSAFE_LINK");
  await expect(
    inspectArchive(tar([metadata, { path: "pipe", type: "FIFO" }])),
  ).rejects.toThrow("XRAG_UNSUPPORTED_ENTRY");
});

it.each(["description.md", "image.png"])(
  "bounds retained metadata bytes (%s)",
  async (path) => {
    const body = "x".repeat(path === "image.png" ? 5_000_001 : 256_001);
    await expect(
      inspectArchive(tar([metadata, { path, body }])),
    ).rejects.toThrow("XRAG_INVALID_METADATA");
  },
);

it("rejects missing or linked metadata and permits duplicate directory headers", async () => {
  await expect(
    inspectArchive(tar([{ path: "data", body: "text" }])),
  ).rejects.toThrow();
  await expect(
    inspectArchive(
      tar([
        { path: "actual.json", body: metadata.body },
        { path: "xrag.json", type: "SymbolicLink", linkpath: "actual.json" },
      ]),
    ),
  ).rejects.toThrow("XRAG_INVALID_METADATA");
  await expect(
    inspectArchive(
      tar([
        metadata,
        { path: "folder", type: "Directory" },
        { path: "folder", type: "Directory" },
      ]),
    ),
  ).resolves.toHaveProperty("xrag.xrag_type", "files");
});

it("preserves safe parent traversal and dangling links inside the destination", async () => {
  const { file, destination, id } = await extractionFixture([
    { path: "folder/data", body: "data" },
    { path: "folder/sub/link", type: "SymbolicLink", linkpath: "../data" },
    { path: "folder/dangling", type: "SymbolicLink", linkpath: "missing" },
    { path: "hard", type: "Link", linkpath: "folder/data" },
    { path: "via-hard", type: "SymbolicLink", linkpath: "hard" },
  ]);
  await extractArchive(file, destination, id);
  expect(await readFile(join(destination, "folder/sub/link"), "utf8")).toBe(
    "data",
  );
  expect(await readFile(join(destination, "via-hard"), "utf8")).toBe("data");
  expect(await readlink(join(destination, "folder/dangling"))).toBe("missing");
});

it("rejects archive size and entry limits while inspecting, before extraction", async () => {
  await expect(
    inspectArchive(
      tar([metadata, { path: "large", body: "payload" }]),
      undefined,
      { maxExtractedBytes: 1, maxEntries: 100 },
    ),
  ).rejects.toThrow("XRAG_EXTRACTED_LIMIT");
  await expect(
    inspectArchive(
      tar([metadata, { path: "many", body: "payload" }]),
      undefined,
      { maxExtractedBytes: 1_000_000, maxEntries: 1 },
    ),
  ).rejects.toThrow("XRAG_ENTRY_LIMIT");
});

it("checks the extraction space reservation before creating any payload", async () => {
  const { file, destination, id } = await extractionFixture([
    { path: "data", body: "payload" },
  ]);
  await expect(
    extractArchive(file, destination, id, undefined, {
      beforeExtract: async (inspection) => {
        expect(inspection.extractedBytes).toBeGreaterThan(7);
        expect(inspection.entryCount).toBe(2);
        throw new Error("XRAG_DISK_SPACE");
      },
    }),
  ).rejects.toThrow("XRAG_DISK_SPACE");
  expect(await readdir(destination)).toEqual([]);
});
