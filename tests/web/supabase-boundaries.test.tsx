vi.mock("server-only", () => ({}));
// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "../../apps/web/lib/supabase/proxy";
import { proxy } from "../../apps/web/proxy";
import { createSupabaseServerClient } from "../../apps/web/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "../../apps/web/lib/supabase/createSupabaseServiceRoleClient";
import { saveCreateSupabaseServiceRoleClient } from "../../apps/web/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { saveGetSupabaseServiceRoleConfig } from "../../apps/web/lib/supabase/saveGetSupabaseServiceRoleConfig";
import { useSessionToken } from "../../apps/web/lib/supabase/use-session-token";
import { SUPABASE_COOKIE_NAME } from "../../apps/web/lib/supabase/_shared";
import { createChunks, stringToBase64URL } from "@supabase/ssr";
const mocks = vi.hoisted(() => ({
  options: undefined as any,
  user: null as any,
  claims: [] as any,
  server: vi.fn(),
  io: vi.fn<() => Promise<void>>(),
  service: vi.fn(),
  cookieSet: vi.fn(),
  cookies: [] as any[],
  refreshCookies: false,
  cookieError: false,
  listeners: new Set<() => void>(),
}));
vi.mock("@supabase/ssr", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@supabase/ssr")>()),
  createServerClient: mocks.server,
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.service }));
vi.mock("next/cache", () => ({ io: mocks.io }));
vi.mock("@schornio/aibox-package-database/user/getCurrentUserClaims", () => ({
  getCurrentUserClaims: async () => mocks.claims,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => mocks.cookies,
    set: (...args: any[]) => {
      mocks.cookieSet(...args);
      if (mocks.cookieError) throw new Error("read-only");
    },
  }),
}));
vi.mock("next-i18next/proxy", () => ({
  createProxy: () => () => NextResponse.next(),
}));
afterEach(cleanup);
beforeEach(() => {
  mocks.user = null;
  mocks.claims = [];
  mocks.cookieError = false;
  mocks.refreshCookies = false;
  mocks.cookies = [];
  mocks.cookieSet.mockClear();
  mocks.service.mockReset().mockReturnValue({ service: true });
  mocks.server.mockReset().mockImplementation((_url, _key, options) => {
    mocks.options = options;
    return {
      auth: {
        getUser: async () => {
          if (mocks.refreshCookies)
            options.cookies.setAll(
              [{ name: "refresh", value: "new", options: { httpOnly: true } }],
              { "x-auth-refreshed": "yes" },
            );
          return { data: { user: mocks.user } };
        },
      },
    };
  });
  mocks.io.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("cookieStore", {
    addEventListener: (_name: string, fn: any) => mocks.listeners.add(fn),
    removeEventListener: (_name: string, fn: any) => mocks.listeners.delete(fn),
  });
  for (const name of document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0])) {
    document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
  mocks.listeners.clear();
});
describe("Supabase HTTP and session boundaries", () => {
  it.each(["/agent?view=cards", "/", "/signin", "/feedback"])(
    "redirects unauthenticated requests when required at %s",
    async (path) => {
      const response = await updateSession(
        new NextRequest(`https://app.test${path}`),
        NextResponse.next(),
      );
      if (path === "/signin" || path === "/feedback")
        expect(response.status).toBe(200);
      else {
        expect(response.status).toBe(307);
        const location = new URL(response.headers.get("location")!);
        expect(location.pathname).toBe("/signin");
        expect(location.searchParams.get("next")).toBe(
          path === "/" ? null : path,
        );
      }
    },
  );
  it("refreshes request cookies, response cookies and auth headers", async () => {
    mocks.user = { id: "user" };
    mocks.refreshCookies = true;
    const request = new NextRequest("https://app.test/agent");
    const response = await updateSession(request, NextResponse.next());
    expect(request.cookies.get("refresh")?.value).toBe("new");
    expect(response.cookies.get("refresh")?.value).toBe("new");
    expect(response.headers.get("x-auth-refreshed")).toBe("yes");
    expect(mocks.options.cookies.getAll()).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "refresh" })]),
    );
  });
  it.each(["/de/agent?query=test", "/en", "/english"])(
    "normalizes legacy language routes %s before checking the session",
    async (path) => {
      mocks.user = { id: "user" };
      const response = await proxy(new NextRequest(`https://app.test${path}`));
      if (path === "/english") expect(response.status).toBe(200);
      else
        expect(response.headers.get("location")).toBe(
          `https://app.test${path.startsWith("/de") ? "/agent?query=test" : "/"}`,
        );
    },
  );
  it("reads server cookies and tolerates read-only cookie stores", async () => {
    mocks.cookies = [{ name: "session", value: "token" }];
    await createSupabaseServerClient();
    expect(mocks.options.cookies.getAll()).toEqual(mocks.cookies);
    mocks.options.cookies.setAll([
      { name: "session", value: "new", options: {} },
    ]);
    expect(mocks.cookieSet).toHaveBeenCalledWith("session", "new", {});
    mocks.cookieError = true;
    expect(() =>
      mocks.options.cookies.setAll([
        { name: "session", value: "new", options: {} },
      ]),
    ).not.toThrow();
  });
  it("defers Auth initialization until dynamic rendering even when cookies are already available", async () => {
    const dynamicRender = Promise.withResolvers<void>();
    mocks.io.mockReturnValue(dynamicRender.promise);
    const client = createSupabaseServerClient();
    await Promise.resolve();
    expect(mocks.io).toHaveBeenCalledOnce();
    expect(mocks.server).not.toHaveBeenCalled();
    dynamicRender.resolve();
    await client;
    expect(mocks.server).toHaveBeenCalledOnce();
  });
  it("creates elevated clients only for administrators", async () => {
    expect(createSupabaseServiceRoleClient()).toEqual({ service: true });
    await expect(saveCreateSupabaseServiceRoleClient()).rejects.toThrow(
      "NOT_AUTHORIZED",
    );
    await expect(saveGetSupabaseServiceRoleConfig()).rejects.toThrow(
      "NOT_AUTHORIZED",
    );
    mocks.claims = "admin";
    expect(await saveCreateSupabaseServiceRoleClient()).toEqual({
      service: true,
    });
    expect(await saveGetSupabaseServiceRoleConfig()).toMatchObject({
      supabaseUrl: expect.any(String),
      supabaseServiceRoleKey: expect.any(String),
    });
  });
  it("subscribes to cookie changes and ignores corrupt or non-token payloads", () => {
    const { result, unmount } = renderHook(useSessionToken);
    expect(result.current).toBeUndefined();
    expect(mocks.listeners.size).toBe(1);
    for (const [payload, expected] of [
      [{ access_token: "token" }, "token"],
      [{ access_token: 1 }, undefined],
      [null, undefined],
      ["invalid", undefined],
    ] as const) {
      act(() => {
        document.cookie = `${SUPABASE_COOKIE_NAME}=base64-${btoa(JSON.stringify(payload))}`;
        mocks.listeners.forEach((fn) => fn());
      });
      expect(result.current).toBe(expected);
    }
    act(() => {
      document.cookie = `${SUPABASE_COOKIE_NAME}=broken`;
      mocks.listeners.forEach((fn) => fn());
    });
    expect(result.current).toBeUndefined();
    unmount();
    expect(mocks.listeners.size).toBe(0);
  });
  it("reads a large SSO session using Supabase's chunking and UTF-8 base64url format", () => {
    const session = {
      access_token: "sso-access-token",
      user: {
        app_metadata: {
          provider: "saml",
          groups: Array.from(
            { length: 300 },
            (_, index) => `Gruppe-${index}-Österreich-العربية`,
          ),
        },
      },
    };
    const chunks = createChunks(
      SUPABASE_COOKIE_NAME,
      `base64-${stringToBase64URL(JSON.stringify(session))}`,
    );
    expect(chunks.length).toBeGreaterThan(2);
    // Cookie header order must not dictate assembly order.
    for (const chunk of chunks.toReversed())
      document.cookie = `${chunk.name}=${encodeURIComponent(chunk.value)}`;
    const { result } = renderHook(useSessionToken);
    expect(result.current).toBe("sso-access-token");
    act(() => {
      document.cookie = `${SUPABASE_COOKIE_NAME}.1=; Max-Age=0`;
      mocks.listeners.forEach((fn) => fn());
    });
    expect(result.current).toBeUndefined();
  });
  it("prefers a refreshed unchunked cookie and follows logout", () => {
    document.cookie = `${SUPABASE_COOKIE_NAME}.0=base64-${stringToBase64URL(JSON.stringify({ access_token: "stale" }))}`;
    document.cookie = `${SUPABASE_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ access_token: "current" }))}`;
    const { result } = renderHook(useSessionToken);
    expect(result.current).toBe("current");
    act(() => {
      for (const name of [SUPABASE_COOKIE_NAME, `${SUPABASE_COOKIE_NAME}.0`])
        document.cookie = `${name}=; Max-Age=0`;
      mocks.listeners.forEach((fn) => fn());
    });
    expect(result.current).toBeUndefined();
  });
  it("reads and refreshes the session in browsers without CookieStore", () => {
    vi.stubGlobal("cookieStore", undefined);
    document.cookie = `${SUPABASE_COOKIE_NAME}=base64-${stringToBase64URL(JSON.stringify({ access_token: "initial" }))}`;
    const { result, unmount } = renderHook(useSessionToken);
    expect(result.current).toBe("initial");
    act(() => {
      document.cookie = `${SUPABASE_COOKIE_NAME}=base64-${stringToBase64URL(JSON.stringify({ access_token: "refreshed" }))}`;
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current).toBe("refreshed");
    unmount();
  });
});
