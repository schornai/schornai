import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestWeb } from "../apps/realtime/src/chat/tools/web/request";

const mocks = vi.hoisted(() => ({ request: vi.fn(), lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ request: mocks.request }));
vi.mock("node:http", () => ({ request: mocks.request }));
const abort = () => new AbortController();
beforeEach(() => {
  mocks.request.mockReset();
  mocks.lookup
    .mockReset()
    .mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
});
afterEach(() => vi.restoreAllMocks());
function respond({
  body = "ok",
  status = 200,
  headers = {},
}: {
  body?: string | Uint8Array;
  status?: number;
  headers?: Record<string, string>;
} = {}) {
  mocks.request.mockImplementation((_url, _options, callback) => {
    const req = new EventEmitter() as EventEmitter & { end(): void };
    req.end = () => {
      const res = new PassThrough() as PassThrough & {
        statusCode: number;
        headers: Record<string, string>;
      };
      res.statusCode = status;
      res.headers = { "content-type": "text/plain", ...headers };
      callback(res);
      if (!res.destroyed) res.end(body);
    };
    return req;
  });
}

describe("web network transport", () => {
  it("preserves certificate verification and the original hostname", async () => {
    respond();
    expect(
      await requestWeb(new URL("https://example.com/path"), {
        signal: abort().signal,
      }),
    ).toMatchObject({ status: 200, body: Buffer.from("ok") });
    const [url, options] = mocks.request.mock.calls[0]!;
    expect(url.hostname).toBe("example.com");
    expect(options).toMatchObject({
      agent: false,
      rejectUnauthorized: true,
      headers: { "Accept-Encoding": "identity" },
    });
  });
  it("preserves binary bytes and download headers", async () => {
    const body = Buffer.from([0, 255, 128, 10]);
    respond({
      body,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="report.pdf"',
      },
    });
    expect(
      await requestWeb(new URL("https://example.com/report"), {
        signal: abort().signal,
      }),
    ).toMatchObject({
      body,
      contentDisposition: 'attachment; filename="report.pdf"',
    });
  });
  it.each([
    "http://10.0.0.1",
    "http://192.168.1.1",
    "http://[fd00::1]",
    "http://intranet.local",
  ])(
    "permits explicitly approved internal destinations: %s",
    async (address) => {
      respond();
      expect(
        await requestWeb(new URL(address), {
          signal: abort().signal,
          allowPrivateNetwork: true,
        }),
      ).toMatchObject({ status: 200 });
      expect(mocks.request.mock.calls[0]![0].href).toBe(new URL(address).href);
    },
  );
  it.each([
    "http://127.1",
    "http://169.254.169.254",
    "http://10.0.0.1",
    "http://[::ffff:127.0.0.1]",
    "http://[fd00::1]",
  ])("blocks private literal address %s by default", async (address) => {
    await expect(
      requestWeb(new URL(address), { signal: abort().signal }),
    ).rejects.toThrow("private network access");
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("rejects a public hostname resolving to any private address", async () => {
    mocks.lookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);
    await expect(
      requestWeb(new URL("https://attacker.example"), {
        signal: abort().signal,
      }),
    ).rejects.toThrow("private network access");
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("pins the checked DNS result into the connection to prevent rebinding", async () => {
    respond();
    await requestWeb(new URL("https://example.com"), {
      signal: abort().signal,
    });
    const options = mocks.request.mock.calls[0]![1];
    mocks.lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    const callback = vi.fn();
    options.lookup("example.com", { all: true }, callback);
    expect(callback).toHaveBeenCalledWith(null, [
      { address: "93.184.216.34", family: 4 },
    ]);
    expect(mocks.lookup).toHaveBeenCalledTimes(1);
  });
  it("rejects cancellation before connecting", async () => {
    const controller = abort();
    controller.abort(new Error("cancel request"));
    await expect(
      requestWeb(new URL("http://localhost"), { signal: controller.signal }),
    ).rejects.toThrow("cancel request");
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it.each([{ body: "a".repeat(11) }, { headers: { "content-length": "11" } }])(
    "bounds streamed and declared response sizes: %j",
    async (response) => {
      respond(response);
      await expect(
        requestWeb(new URL("https://example.com"), {
          signal: abort().signal,
          maxBytes: 10,
        }),
      ).rejects.toThrow("maximum response size");
    },
  );
  it("returns redirects without following them or forwarding credentials", async () => {
    respond({
      status: 302,
      headers: { location: "https://other.example.com" },
    });
    expect(
      await requestWeb(new URL("https://example.com"), {
        signal: abort().signal,
        headers: { Authorization: "Bearer private" },
      }),
    ).toMatchObject({
      status: 302,
      location: "https://other.example.com",
      body: new Uint8Array(),
    });
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
});
