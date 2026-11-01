import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSAMLMetadata } from "../../packages/database/src/sso/getSAMLMetadata";

const state = vi.hoisted(() => ({
  authorized: true,
  service: { rpc: vi.fn() },
  config: {
    supabaseUrl: "https://instance.test",
    supabaseServiceRoleKey: "test-only",
  },
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => async (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
    action: (handler: any) => handler,
  },
}));
vi.mock("@/lib/supabase/saveCreateSupabaseServiceRoleClient", () => ({
  saveCreateSupabaseServiceRoleClient: async () => {
    if (!state.authorized) throw new Error("NOT_AUTHORIZED");
    return state.service;
  },
}));
vi.mock("@/lib/supabase/saveGetSupabaseServiceRoleConfig", () => ({
  saveGetSupabaseServiceRoleConfig: async () => {
    if (!state.authorized) throw new Error("NOT_AUTHORIZED");
    return state.config;
  },
}));
import { reissueResetKey } from "../../apps/web/app/(settings)/settings/user/_actions/reissueResetKey";
import { downloadSAMLMetadata } from "../../apps/web/app/(settings)/settings/sso/_actions/downloadSAMLMetadata";

beforeEach(() => {
  vi.clearAllMocks();
  state.authorized = true;
});
afterEach(() => vi.unstubAllGlobals());
const userId = "a58d9c82-9d86-4db2-81fc-385fc796503f";
describe("reset key reissue", () => {
  it("requires global administration before calling the database", async () => {
    state.authorized = false;
    await expect(reissueResetKey({ userId })).rejects.toThrow("NOT_AUTHORIZED");
    expect(state.service.rpc).not.toHaveBeenCalled();
  });
  it("validates the target before accessing the service", async () => {
    await expect(reissueResetKey({ userId: "bad" })).rejects.toThrow();
    expect(state.service.rpc).not.toHaveBeenCalled();
  });
  it("issues distinct random keys through one atomic database operation", async () => {
    state.service.rpc.mockResolvedValue({
      data: "2026-10-24T12:00:00Z",
      error: null,
    });
    const first: any = await reissueResetKey({ userId });
    const second: any = await reissueResetKey({ userId });
    expect(first.passwordResetKey).toMatch(/^[a-f0-9]{64}$/);
    expect(first.passwordResetKey).not.toBe(second.passwordResetKey);
    expect(state.service.rpc).toHaveBeenCalledWith(
      "reissue_password_reset_key",
      { target_user_id: userId, new_reset_key: first.passwordResetKey },
    );
    expect(first.expires).toBe("2026-10-24T12:00:00Z");
  });
  it.each(["LOCAL_USER_REQUIRED", "database error containing secret"])(
    "sanitizes issuance failures: %s",
    async (message) => {
      state.service.rpc.mockResolvedValue({ error: { message }, data: null });
      await expect(reissueResetKey({ userId })).rejects.toThrow(
        /^REISSUE_RESET_KEY_FAILED$/,
      );
    },
  );
});
describe("SAML metadata", () => {
  it("requires global administration before fetching metadata", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    state.authorized = false;
    await expect(downloadSAMLMetadata()).rejects.toThrow("NOT_AUTHORIZED");
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    "https://instance.test",
    "https://instance.test/",
    "https://instance.test/auth/v1",
  ])(
    "fetches metadata from the configured instance %s",
    async (supabaseUrl) => {
      const xml =
        '<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" />';
      const fetch = vi.fn().mockResolvedValue(
        new Response(xml, {
          headers: { "content-type": "application/samlmetadata+xml" },
        }),
      );
      vi.stubGlobal("fetch", fetch);
      expect(
        await getSAMLMetadata({
          supabaseServiceRoleConfig: { ...state.config, supabaseUrl },
        }),
      ).toEqual({ configured: true, xml });
      expect(String(fetch.mock.calls[0][0])).toBe(
        "https://instance.test/auth/v1/sso/saml/metadata?download=true",
      );
      expect(fetch.mock.calls[0][1]).toMatchObject({
        cache: "no-store",
        redirect: "error",
      });
    },
  );
  it("identifies a disabled SAML service", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{}", {
          status: 404,
          headers: { "x-sb-error-code": "saml_provider_disabled" },
        }),
      ),
    );
    expect(await downloadSAMLMetadata()).toEqual({ configured: false });
  });
  it.each([
    new Response("not found", { status: 404 }),
    new Response("unavailable", { status: 503 }),
    new Response("<html>error</html>", {
      headers: { "content-type": "text/html" },
    }),
    new Response("", { headers: { "content-type": "application/xml" } }),
    new Response("x".repeat(1024 * 1024 + 1), {
      headers: { "content-type": "application/xml" },
    }),
  ])("rejects unsuccessful or invalid responses", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(downloadSAMLMetadata()).rejects.toThrow(/SAML_METADATA_/);
  });
  it("sanitizes network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("secret header")),
    );
    await expect(downloadSAMLMetadata()).rejects.toThrow(
      /^SAML_METADATA_UNAVAILABLE$/,
    );
  });
});
