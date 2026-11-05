import { Webhook } from "standardwebhooks";
import { safeRedirectPath } from "../../apps/web/lib/safeRedirectPath";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as download } from "../../apps/web/app/api/storage/[storage]/[...path]/route";
import { GET as callback } from "../../apps/web/app/api/auth/callback/route";
import { POST as accessToken } from "../../apps/web/app/api/auth/access-token/route";
import * as tus from "../../apps/web/app/api/storage/upload/resumable/[[...path]]/route";
const hookSecret = `whsec_${Buffer.alloc(32, 7).toString("base64")}`;
function signedHook(body: unknown, timestamp = new Date()) {
  const payload = JSON.stringify(body);
  const id = "test-hook-id";
  return new Request("https://aibox.test/api/auth/access-token", {
    method: "POST",
    body: payload,
    headers: {
      "webhook-id": id,
      "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "webhook-signature": new Webhook(hookSecret).sign(id, timestamp, payload),
    },
  });
}
const state = vi.hoisted(() => ({
  sign: vi.fn(),
  download: vi.fn(),
  exchange: vi.fn(),
  buildToken: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({
    storage: { from: state.from },
    auth: { exchangeCodeForSession: state.exchange },
  }),
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: () => ({ service: true }),
}));
vi.mock("@schornio/aibox-package-database/user/buildAccessToken", () => ({
  buildAccessToken: state.buildToken,
}));
beforeEach(() => {
  state.from.mockReset().mockReturnValue({
    createSignedUrl: state.sign,
    download: state.download,
  });
  state.download.mockReset().mockResolvedValue({
    data: new Blob(["<svg/>"], { type: "image/svg+xml" }),
    error: null,
  });
  state.sign.mockReset().mockResolvedValue({
    data: { signedUrl: "https://storage.test/signed" },
    error: null,
  });
  state.exchange.mockReset().mockResolvedValue({ error: null });
  state.buildToken.mockReset().mockResolvedValue({ workspace: "editor" });
  vi.stubEnv("SITE_URL", "https://aibox.test");
  vi.stubEnv("SUPABASE_AUTH_HOOK_SECRET", `v1,${hookSecret}`);
});
describe("storage download route", () => {
  it.each(["database_files", "realtime_files"])(
    "serves the saved original during recovery in %s",
    async (storage) => {
      const base64 = Buffer.from("old original").toString("base64");
      state.download.mockResolvedValue({
        data: new Blob([
          JSON.stringify({
            version: 1,
            original: { base64, type: "text/plain" },
            sidecar: null,
          }),
        ]),
        error: null,
      });
      const response = await download(new Request("https://aibox.test"), {
        params: Promise.resolve({ storage, path: ["folder", "file.txt"] }),
      } as any);
      expect(await response.text()).toBe("old original");
      expect(state.sign).not.toHaveBeenCalled();
      expect(response.headers.get("content-security-policy")).toContain(
        "sandbox",
      );
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    },
  );
  it("does not expose a partial original if the recovery record cannot be read", async () => {
    state.download.mockResolvedValue({
      data: null,
      error: new Error("unavailable"),
    });
    const response = await download(new Request("https://aibox.test"), {
      params: Promise.resolve({
        storage: "database_files",
        path: ["file.txt"],
      }),
    } as any);
    expect(response.status).toBe(503);
    expect(state.sign).not.toHaveBeenCalled();
  });
  it("preserves the SVG content type and sandboxes theme logos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<svg/>", {
          headers: { "Content-Type": "image/svg+xml" },
        }),
      ),
    );
    const response = await download(
      new Request("https://aibox.test/api/storage/theme_logos/logo.svg"),
      {
        params: Promise.resolve({ storage: "theme_logos", path: ["logo.svg"] }),
      } as any,
    );
    expect(state.from).toHaveBeenCalledWith("theme_logos");
    expect(state.download).toHaveBeenCalledWith("logo.svg", undefined, {
      signal: expect.any(AbortSignal),
    });
    expect(state.sign).not.toHaveBeenCalled();
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
    expect(response.headers.get("content-security-policy")).toBe(
      "sandbox; default-src 'none'",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe("<svg/>");
  });
  it("does not expose Storage errors when a theme logo cannot be downloaded", async () => {
    state.download.mockResolvedValue({
      data: null,
      error: new Error("private storage details"),
    });
    const response = await download(new Request("https://aibox.test"), {
      params: Promise.resolve({
        storage: "theme_logos",
        path: ["missing.svg"],
      }),
    } as any);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
    expect(state.sign).not.toHaveBeenCalled();
  });
  it.each([200, 206, 416])(
    "streams upstream status %s and range headers",
    async (status) => {
      let controller!: ReadableStreamDefaultController<Uint8Array>;
      const body = new ReadableStream<Uint8Array>({
        start(value) {
          controller = value;
        },
      });
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(body, {
          status,
          headers: {
            "Content-Type": "video/mp4",
            "Content-Range": status === 416 ? "bytes */100" : "bytes 20-29/100",
            "Accept-Ranges": "bytes",
            ETag: '"version"',
            "Content-Length": "10",
            "Set-Cookie": "secret=value",
          },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const request = new Request("https://aibox.test", {
        headers: {
          Range: "bytes=20-29",
          "If-Range": '"version"',
          Cookie: "private=value",
        },
      });
      const response = await download(request, {
        params: Promise.resolve({
          storage: "files",
          path: ["folder", "video.mp4"],
        }),
      } as any);
      expect(state.from).toHaveBeenCalledWith("files");
      expect(state.sign).toHaveBeenCalledWith("folder/video.mp4", 60);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://storage.test/signed");
      expect(options.headers.get("range")).toBe("bytes=20-29");
      expect(options.headers.get("if-range")).toBe('"version"');
      expect(options.headers.has("cookie")).toBe(false);
      expect(options.signal).toBe(request.signal);
      expect(options.cache).toBe("no-store");
      expect(response.status).toBe(status);
      expect(response.headers.get("content-type")).toBe("video/mp4");
      expect(response.headers.get("content-range")).toBe(
        status === 416 ? "bytes */100" : "bytes 20-29/100",
      );
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.has("set-cookie")).toBe(false);
      // Headers return before the source has delivered any bytes.
      controller.enqueue(new TextEncoder().encode("0123456789"));
      controller.close();
      expect(await response.text()).toBe("0123456789");
    },
  );
  it("does not fetch files when the user-scoped signing request is denied", async () => {
    state.sign.mockResolvedValue({ data: null, error: new Error("denied") });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await download(new Request("https://aibox.test"), {
      params: Promise.resolve({ storage: "files", path: ["missing"] }),
    } as any);
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([403, 404, 500])(
    "handles upstream failure %s without exposing its body",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("private details", { status })),
      );
      const response = await download(new Request("https://aibox.test"), {
        params: Promise.resolve({ storage: "files", path: ["video.mp4"] }),
      } as any);
      expect(response.status).toBe(status === 404 ? 404 : 502);
      expect(await response.text()).toBe("");
    },
  );
  it("handles a failed upstream connection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await download(new Request("https://aibox.test"), {
      params: Promise.resolve({ storage: "files", path: ["video.mp4"] }),
    } as any);
    expect(response.status).toBe(502);
  });
});
describe("authentication callbacks", () => {
  it("exchanges an auth code and redirects to the configured site and destination", async () => {
    expect(
      (
        await callback(
          new Request(
            "https://proxy.test/api/auth/callback?code=abc&next=/agent",
          ),
        )
      ).headers.get("location"),
    ).toBe("https://aibox.test/agent");
    expect(state.exchange).toHaveBeenCalledWith("abc");
    expect(
      (
        await callback(
          new Request("https://proxy.test/api/auth/callback?code=abc"),
        )
      ).headers.get("location"),
    ).toBe("https://aibox.test/");
  });
  it("redirects missing or failed codes to the signin error screen", async () => {
    expect(
      (
        await callback(new Request("https://aibox.test/api/auth/callback"))
      ).headers.get("location"),
    ).toBe("https://aibox.test/signin?error");
    expect(state.exchange).not.toHaveBeenCalled();
    state.exchange.mockResolvedValue({ error: new Error("expired") });
    expect(
      (
        await callback(
          new Request("https://aibox.test/api/auth/callback?code=expired"),
        )
      ).headers.get("location"),
    ).toBe("https://aibox.test/signin?error");
  });
  it("adds organization roles while preserving the original access token claims", async () => {
    const body = {
      user_id: "70e1a15b-74c7-4f17-94df-fc4a0da59123",
      authentication_method: "password",
      claims: {
        sub: "70e1a15b-74c7-4f17-94df-fc4a0da59123",
        role: "authenticated",
        existing: "claim",
      },
    };
    const response = await accessToken(signedHook(body));
    expect(await response.json()).toEqual({
      ...body,
      claims: { ...body.claims, organization_roles: { workspace: "editor" } },
    });
    expect(state.buildToken).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: body.user_id }),
      { supabaseServiceRole: { service: true } },
    );
  });
});
describe("resumable upload proxy", () => {
  it.each(["POST", "PATCH", "DELETE", "HEAD"] as const)(
    "forwards %s with authorization and rewrites the upload location",
    async (method) => {
      const response = new Response(method === "HEAD" ? null : "response", {
        status: 200,
        headers: {
          location: "https://supabase.test/upload/resumable/upload-id",
          "upload-offset": "42",
        },
      });
      const fetch = vi.fn(async () => response);
      vi.stubGlobal("fetch", fetch);
      const request = new Request(
        "https://aibox.test/api/storage/upload/resumable",
        {
          method,
          headers: {
            authorization: "Bearer user-token",
            host: "aibox.test",
            "tus-resumable": "1.0.0",
          },
          ...(method === "HEAD" ? {} : { body: "file bytes" }),
        },
      );
      const result = await tus[method](request, {
        params: Promise.resolve({ path: ["upload id", "ä"] }),
      } as any);
      expect(fetch.mock.lastCall![0]).toBe(
        "http://supabase.test/storage/v1/upload/resumable/upload%20id/%C3%A4",
      );
      const options: any = fetch.mock.lastCall![1];
      expect(options.method).toBe(method);
      expect(options.headers.get("authorization")).toBe("Bearer user-token");
      expect(options.headers.get("apikey")).toBe("test-public-anon");
      expect(options.headers.has("host")).toBe(false);
      expect(options.body).toBe(method === "HEAD" ? undefined : request.body);
      expect(result.headers.get("location")).toBe(
        "/api/storage/upload/resumable/upload-id",
      );
      expect(result.headers.get("upload-offset")).toBe("42");
      expect(await result.text()).toBe(method === "HEAD" ? "" : "response");
    },
  );
  it("handles the initial upload endpoint and absent or unrelated locations", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    const request = new Request(
      "https://aibox.test/api/storage/upload/resumable",
      { method: "POST", headers: { authorization: "Bearer user-token" } },
    );
    const response = await tus.POST(request, {
      params: Promise.resolve({}),
    } as any);
    expect(fetch.mock.lastCall![0]).toBe(
      "http://supabase.test/storage/v1/upload/resumable",
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("location")).toBeNull();
    fetch.mockResolvedValue(
      new Response("upstream", {
        headers: { location: "https://other.test/unrelated" },
      }),
    );
    expect(
      (
        await tus.POST(request, {
          params: Promise.resolve({ path: [] }),
        } as any)
      ).headers.get("location"),
    ).toBeNull();
  });
});

describe("web security boundaries", () => {
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "@evil.test",
    "javascript:alert(1)",
    "/\nevil.test",
  ])(
    "rejects external/control redirect destination %j",
    async (destination) => {
      expect(safeRedirectPath(destination)).toBe("/");
      const response = await callback(
        new Request(
          `https://proxy.test/api/auth/callback?code=valid&next=${encodeURIComponent(destination)}`,
        ),
      );
      expect(response.headers.get("location")).toBe("https://aibox.test/");
    },
  );
  it("preserves local paths, query strings and fragments", () => {
    expect(safeRedirectPath("/agent?view=files#item")).toBe(
      "/agent?view=files#item",
    );
  });
  it.each(["text/html", "image/svg+xml", "application/xhtml+xml"])(
    "isolates uploaded %s documents from the app origin",
    async (type) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response("<script>attack()</script>", {
            headers: { "content-type": type },
          }),
        ),
      );
      const response = await download(new Request("https://aibox.test"), {
        params: Promise.resolve({ storage: "files", path: ["payload"] }),
      } as any);
      expect(response.headers.get("content-disposition")).toBe("attachment");
      expect(response.headers.get("content-security-policy")).toBe(
        "sandbox; default-src 'none'",
      );
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    },
  );
  it("rejects unsigned, tampered and stale auth hooks before service access", async () => {
    const unsigned = new Request("https://aibox.test/api/auth/access-token", {
      method: "POST",
      body: "{}",
    });
    expect((await accessToken(unsigned)).status).toBe(401);
    const tampered = signedHook({ claims: {} });
    tampered.headers.set("webhook-signature", "v1,invalid");
    expect((await accessToken(tampered)).status).toBe(401);
    expect(
      (await accessToken(signedHook({}, new Date(Date.now() - 600_000))))
        .status,
    ).toBe(401);
    expect(state.buildToken).not.toHaveBeenCalled();
  });
  it("fails closed without a hook secret and rejects signed invalid identities", async () => {
    const id = "70e1a15b-74c7-4f17-94df-fc4a0da59123";
    expect(
      (
        await accessToken(
          signedHook({
            user_id: id,
            claims: { sub: "e2258565-1f8d-4dbb-a66f-0ed0f2dd73c4" },
          }),
        )
      ).status,
    ).toBe(400);
    vi.stubEnv("SUPABASE_AUTH_HOOK_SECRET", "");
    expect(await accessToken(signedHook({}))).toHaveProperty("status", 503);
    vi.stubEnv("SUPABASE_AUTH_HOOK_SECRET", "whsec_c2hvcnQ=");
    expect((await accessToken(signedHook({}))).status).toBe(503);
    expect(state.buildToken).not.toHaveBeenCalled();
  });
  it("bounds hook bodies and hides downstream failures", async () => {
    expect(
      (await accessToken(signedHook({ large: "x".repeat(256 * 1024) }))).status,
    ).toBe(413);
    state.buildToken.mockRejectedValue(new Error("service-role-secret"));
    const id = "70e1a15b-74c7-4f17-94df-fc4a0da59123";
    const response = await accessToken(
      signedHook({ user_id: id, claims: { sub: id } }),
    );
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");
  });
  it("blocks missing upload authorization and dot-segment traversal", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(
      (
        await tus.POST(new Request("https://aibox.test"), {
          params: Promise.resolve({}),
        } as any)
      ).status,
    ).toBe(401);
    for (const path of [[".."], ["."], ["nested/path"], ["\\path"]]) {
      const request = new Request("https://aibox.test", {
        method: "POST",
        headers: { authorization: "Bearer user-token" },
      });
      expect(
        (await tus.POST(request, { params: Promise.resolve({ path }) } as any))
          .status,
      ).toBe(400);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not forward cookies, routing headers or upstream cookies through uploads", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        headers: {
          "set-cookie": "aibox=attacker",
          "access-control-allow-origin": "*",
        },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const request = new Request("https://aibox.test", {
      method: "POST",
      headers: {
        authorization: "Bearer user-token",
        cookie: "session=private",
        "x-forwarded-host": "evil.test",
        apikey: "attacker",
      },
    });
    const response = await tus.POST(request, {
      params: Promise.resolve({}),
    } as any);
    const options = fetch.mock.calls[0][1];
    expect(options.headers.has("cookie")).toBe(false);
    expect(options.headers.has("x-forwarded-host")).toBe(false);
    expect(options.headers.get("apikey")).toBe("test-public-anon");
    expect(options.redirect).toBe("error");
    expect(options.cache).toBe("no-store");
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
  });
});
