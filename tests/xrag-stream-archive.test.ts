import { expect, it } from "vitest";
import { Readable } from "node:stream";
import { Header } from "tar";
import {
  archiveSize,
  streamArchive,
  jsonArchiveEntry,
} from "../packages/xrag/src/streamArchive.ts";
import { inspectArchive } from "../packages/xrag/src/archive.ts";
it("writes readable tar archives with exact size, unicode paths and unchanged bytes", async () => {
  const entries = [
    jsonArchiveEntry("xrag.json", {
      xrag_version: 1,
      xrag_type: "files",
      targets: ["ollama"],
      name: "test",
    }),
    jsonArchiveEntry("lang/" + "ä".repeat(100) + ".json", { a: 1 }),
  ];
  const chunks = [];
  for await (const chunk of streamArchive(entries)) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  expect(bytes.length).toBe(archiveSize(entries));
  const archive = await inspectArchive(Readable.from([bytes]));
  expect(archive.xrag.xrag_type).toBe("files");
});
it("encodes files over 100 GiB and honors backpressure without allocating the payload", async () => {
  let pulled = 0;
  const size = 120 * 1024 ** 3;
  const entry = {
    path: "large.xrag.tar",
    size,
    open: async function* () {
      while (true) {
        pulled++;
        yield Buffer.alloc(64 * 1024);
      }
    },
  };
  expect(archiveSize([entry])).toBeGreaterThan(size);
  const headers = streamArchive([entry]);
  const encoded = (await headers.next()).value!;
  expect(new Header(Buffer.from(encoded), encoded.length - 512).size).toBe(
    size,
  );
  await headers.return(undefined);

  const stream = Readable.from(streamArchive([entry]), {
    objectMode: false,
    highWaterMark: 64 * 1024,
  });
  const iterator = stream[Symbol.asyncIterator]();
  const first = await iterator.next();
  expect(new Header(Buffer.from(first.value).subarray(0, 512)).cksumValid).toBe(
    true,
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(pulled).toBeLessThan(5);
  stream.destroy();
});
it.each([1, 3])("rejects changed source lengths (%i)", async (length) => {
  const run = async () => {
    for await (const _ of streamArchive([
      {
        path: "file",
        size: 2,
        open: async function* () {
          yield Buffer.alloc(length);
        },
      },
    ])) {
    }
  };
  await expect(run()).rejects.toThrow("XRAG_SOURCE_CHANGED");
});
it("aborts before opening the next source", async () => {
  const controller = new AbortController();
  controller.abort();
  const stream = streamArchive(
    [jsonArchiveEntry("xrag.json", {})],
    controller.signal,
  );
  await expect(stream.next()).rejects.toThrow();
});

it.each([-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
  "rejects an invalid entry length before reading its bytes (%s)",
  async (size) => {
    const entry = {
      path: "file",
      size,
      open: () => {
        throw new Error("opened");
      },
    };
    expect(() => archiveSize([entry])).toThrow("XRAG_INVALID_SIZE");
    await expect(streamArchive([entry]).next()).rejects.toThrow(
      "XRAG_INVALID_SIZE",
    );
  },
);

it("rejects a tar size that overflows only after adding framing", () => {
  expect(() =>
    archiveSize([{ path: "model", size: Number.MAX_SAFE_INTEGER }]),
  ).toThrow("XRAG_INVALID_SIZE");
});

it("does not insert padding between aligned or empty entries", async () => {
  const block = Buffer.alloc(512, 42);
  const chunks = await Array.fromAsync(
    streamArchive([
      { path: "empty", size: 0, open: async function* () {} },
      {
        path: "aligned",
        size: block.length,
        open: async function* () {
          yield block;
        },
      },
    ]),
  );
  expect(chunks.map((chunk) => chunk.length)).toEqual([512, 512, 512, 1024]);
  expect(chunks[2]).toEqual(block);
});
