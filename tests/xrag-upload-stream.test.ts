import { createServer } from "node:http";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { uploadExportStream } from "../packages/database/src/xrag/uploadExportStream.ts";

it.each(["legacy-key", "sb_secret_test"])(
  "uses bounded TUS chunks and resumes with the configured key format (%s)",
  async (token) => {
    const chunk = Buffer.alloc(64 * 1024, 42);
    const length = 20 * 1024 * 1024 + 17;
    let maxAhead = 0;
    let generated = 0,
      offset = 0,
      failed = false,
      largest = 0;
    const expected = createHash("sha256");
    const actual = createHash("sha256");
    const server = createServer(async (req, res) => {
      expect(req.headers.apikey).toBe(token);
      expect(req.headers.authorization).toBe(
        token.startsWith("sb_secret_") ? undefined : `Bearer ${token}`,
      );
      res.setHeader("Tus-Resumable", "1.0.0");
      if (req.method === "POST") {
        res.writeHead(201, {
          Location: "http://internal-storage.invalid/upload/resumable/one",
        });
        res.end();
        return;
      }
      if (req.method === "HEAD") {
        res.writeHead(200, {
          "Upload-Offset": String(offset),
          "Upload-Length": String(length),
        });
        res.end();
        return;
      }
      if (req.method === "DELETE") {
        res.writeHead(204);
        res.end();
        return;
      }
      expect(Number(req.headers["upload-offset"])).toBe(offset);
      let received = 0;
      for await (const bytes of req) {
        actual.update(bytes);
        received += bytes.length;
      }
      offset += received;
      largest = Math.max(largest, received);
      if (!failed) {
        failed = true;
        req.socket.destroy();
        return;
      }
      res.writeHead(204, { "Upload-Offset": String(offset) });
      res.end();
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address() as { port: number };
    const stream = Readable.from(
      (async function* () {
        while (generated < length) {
          const bytes = chunk.subarray(
            0,
            Math.min(chunk.length, length - generated),
          );
          generated += bytes.length;
          maxAhead = Math.max(maxAhead, generated - offset);
          expected.update(bytes);
          yield bytes;
        }
      })(),
      { objectMode: false, highWaterMark: chunk.length },
    );
    try {
      await uploadExportStream(stream, length, "owner/attempt/package.tar", {
        endpoint: `http://127.0.0.1:${address.port}/storage/v1/upload/resumable`,
        token,
        signal: new AbortController().signal,
        onProgress: () => {},
      });
      expect(offset).toBe(length);
      expect(actual.digest("hex")).toBe(expected.digest("hex"));
      expect(largest).toBeLessThanOrEqual(6 * 1024 * 1024);
      expect(failed).toBe(true);
      expect(maxAhead).toBeLessThanOrEqual(3 * 6 * 1024 * 1024);
    } finally {
      stream.destroy();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
  20000,
);
