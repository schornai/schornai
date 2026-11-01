import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requestWeb } from "../apps/realtime/src/chat/tools/web/request";

const server = createServer((request, response) => {
  response.setHeader("Content-Type", "text/plain");
  if (request.url === "/slow") {
    response.flushHeaders();
    return;
  }
  response.end("Local fetch works");
});
let port: number;

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, () => resolve());
  });
  port = (server.address() as AddressInfo).port;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe("local web requests", () => {
  it.each(["127.0.0.1", "localhost"])(
    "downloads from a real local server through %s",
    async (host) => {
      const result = await requestWeb(
        new URL(`http://${host}:${port}/file.txt`),
        { signal: AbortSignal.timeout(5000), allowPrivateNetwork: true },
      );
      expect(result.status).toBe(200);
      expect(new TextDecoder().decode(result.body)).toBe("Local fetch works");
    },
  );
  it("can cancel a local request while the response is pending", async () => {
    await expect(
      requestWeb(new URL(`http://localhost:${port}/slow`), {
        signal: AbortSignal.timeout(100),
        allowPrivateNetwork: true,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
