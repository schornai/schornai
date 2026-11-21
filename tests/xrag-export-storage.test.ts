import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { afterEach, expect, it, vi } from "vitest";
import { saveTransferExport } from "../packages/database/src/xrag/saveTransferExport.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function file(bytes: Uint8Array) {
  const directory = await mkdtemp(join(tmpdir(), "xrag-storage-test-"));
  directories.push(directory);
  const path = join(directory, "export.xrag.tar");
  await writeFile(path, bytes);
  return path;
}

it("sends the complete archive through the Supabase fetch boundary as a Web Stream", async () => {
  const bytes = Buffer.alloc(256 * 1024, 42);
  const path = await file(bytes);
  const fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url).includes("/object/sign/")) {
      return Response.json({
        signedURL: "/object/sign/xrag-transfers/export?token=test",
      });
    }
    if (String(url).includes("/object/info/"))
      return Response.json({ size: bytes.length });
    // A Node ReadStream was accepted by our old upload mock, but produced a
    // zero-byte object inside the real Next.js server. Exercise the SDK too.
    expect(init?.body).toBeInstanceOf(ReadableStream);
    expect(new Headers(init?.headers).get("Content-Length")).toBe(
      String(bytes.length),
    );
    const received = Buffer.from(await new Response(init?.body).arrayBuffer());
    expect(received).toEqual(bytes);
    return Response.json({ Key: "export", Id: "export" });
  });
  const supabase = createClient("http://storage.test", "test-key", {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await saveTransferExport(path, "export.xrag.tar", "user", {
    supabase: supabase as any,
  });
  expect(result.size).toBe(bytes.length);
  expect(fetch).toHaveBeenCalledTimes(3);
});

it("rejects empty archives before uploading or issuing a download URL", async () => {
  const path = await file(new Uint8Array());
  const from = vi.fn();
  await expect(
    saveTransferExport(path, "empty.xrag.tar", "user", {
      supabase: { storage: { from } } as any,
    }),
  ).rejects.toThrow("XRAG_EXPORT_FAILED");
  expect(from).not.toHaveBeenCalled();
});

it.each([65536, 1, null])(
  "never issues a download link when uploaded size is wrong or unverified: %s",
  async (missing) => {
    const path = await file(Buffer.alloc(128 * 1024));
    const bucket = {
      upload: vi.fn(async (_path, body) => {
        for await (const _ of body) {
        }
        return { error: null };
      }),
      info: vi.fn(async () =>
        missing === null
          ? { error: new Error("offline"), data: null }
          : { error: null, data: { size: 128 * 1024 - missing } },
      ),
      remove: vi.fn(async () => ({ error: null })),
      createSignedUrl: vi.fn(),
    };
    await expect(
      saveTransferExport(path, "model.xrag.tar", "user", {
        supabase: { storage: { from: () => bucket } } as any,
      }),
    ).rejects.toThrow("XRAG_EXPORT_FAILED");
    expect(bucket.createSignedUrl).not.toHaveBeenCalled();
    expect(bucket.remove).toHaveBeenCalledOnce();
  },
);

it("uploads a large MCP transfer through TUS to the transfer bucket in bounded requests", async () => {
  const { createServer } = await import("node:http");
  const { Readable } = await import("node:stream");
  const size = 6 * 1024 ** 2 + 17;
  const lengths: number[] = [];
  let offset = 0,
    metadata = "";
  const server = createServer(async (req, res) => {
    res.setHeader("Tus-Resumable", "1.0.0");
    if (req.method === "POST") {
      metadata = String(req.headers["upload-metadata"]);
      res.writeHead(201, { Location: "/storage/v1/upload/resumable/id" }).end();
    } else {
      let length = 0;
      for await (const chunk of req) length += chunk.length;
      lengths.push(length);
      offset += length;
      res.writeHead(204, { "Upload-Offset": String(offset) }).end();
    }
  });
  await new Promise<void>((resolve, reject) =>
    server.once("error", reject).listen(0, "127.0.0.1", resolve),
  );
  const address = server.address() as { port: number };
  vi.stubEnv("SUPABASE_URL", `http://127.0.0.1:${address.port}`);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-token");
  const bucket = {
    info: async () => ({ data: { size: offset } }),
    createSignedUrl: async () => ({ data: { signedUrl: "download" } }),
  };
  try {
    const result = await saveTransferExport(
      {
        stream: Readable.from([Buffer.alloc(size)], { objectMode: false }),
        size,
      },
      "model.xrag.tar",
      "owner",
      { supabase: { storage: { from: () => bucket } } as any },
    );
    expect(result.size).toBe(size);
    expect(lengths).toEqual([6 * 1024 ** 2, 17]);
    expect(metadata).toContain(
      "bucketName " + Buffer.from("xrag-transfers").toString("base64"),
    );
  } finally {
    vi.unstubAllEnvs();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
