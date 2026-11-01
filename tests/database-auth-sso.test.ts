import { describe, expect, it, vi } from "vitest";
import { jwtVerify } from "jose";
import { database } from "./helpers/supabase";
import { createClientWithClaims } from "../packages/database/src/auth/createClientWithClaims";
import { getSSOProvider } from "../packages/database/src/sso/getSSOProvider";
import { addSSOProvider } from "../packages/database/src/sso/addSSOProvider";
import { deleteSSOProvider } from "../packages/database/src/sso/deleteSSOProvider";
import { updateSSOProviderAttributeMappings } from "../packages/database/src/sso/updateSSOProviderAttributeMappings";
import { getUsers } from "../packages/database/src/user/getUsers";
import { getUsersWithWorkspaceClaim } from "../packages/database/src/user/getUsersWithWorkspaceClaim";
import { getUserById } from "../packages/database/src/user/getUserById";
const state = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: state.createClient }));
const service = {
  supabaseUrl: "https://supabase.test",
  supabaseServiceRoleKey: "test-key",
};
const provider = { id: "provider", saml: { attribute_mapping: { keys: {} } } };
describe("scoped Supabase tokens", () => {
  it("signs claims, identity and one-hour expiration into the client authorization header", async () => {
    vi.stubEnv("SUPABASE_JWT_SECRET", "secret-for-local-tests-only");
    state.createClient.mockReturnValue({ id: "client" });
    const claims = { workspace: "editor" } as any;
    expect(await createClientWithClaims("user", claims)).toEqual({
      id: "client",
    });
    const [url, key, options] = state.createClient.mock.lastCall!;
    expect(url).toBe("http://supabase.test");
    expect(key).toBe("test-anon");
    const token = options.global.headers.Authorization.slice(7);
    const { payload, protectedHeader } = await jwtVerify(
      token,
      new TextEncoder().encode("secret-for-local-tests-only"),
    );
    expect(protectedHeader.alg).toBe("HS256");
    expect(payload).toMatchObject({
      sub: "user",
      role: "authenticated",
      organization_roles: claims,
    });
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000) + 3500);
  });
  it("supports custom environment keys and rejects missing secrets", async () => {
    const keys = {
      supabaseJWTSecret: "TEST_JWT",
      supabaseKey: "TEST_KEY",
      supabaseUrl: "TEST_URL",
    };
    vi.stubEnv("TEST_JWT", "test-secret");
    vi.stubEnv("TEST_KEY", "key");
    vi.stubEnv("TEST_URL", "https://local.test");
    await createClientWithClaims("user", {}, { environmentKeys: keys });
    expect(state.createClient.mock.lastCall!.slice(0, 2)).toEqual([
      "https://local.test",
      "key",
    ]);
    vi.stubEnv("TEST_JWT", "");
    await expect(
      createClientWithClaims("user", {}, { environmentKeys: keys }),
    ).rejects.toThrow("TEST_JWT");
  });
});
describe("SSO administration", () => {
  it("reads one provider and rejects missing or ambiguous configuration", async () => {
    const fetch = vi.fn(async () => ({
      json: async () => ({ items: [provider] }),
      ok: true,
    }));
    vi.stubGlobal("fetch", fetch);
    expect(
      await getSSOProvider({ supabaseServiceRoleConfig: service }),
    ).toEqual(provider);
    expect(fetch).toHaveBeenCalledWith(
      "https://supabase.test/auth/v1/admin/sso/providers",
      {
        headers: {
          APIKey: "test-key",
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        },
      },
    );
    fetch.mockResolvedValue({ json: async () => ({}), ok: true } as any);
    await expect(
      getSSOProvider({ supabaseServiceRoleConfig: service }),
    ).rejects.toThrow("NOT_FOUND");
    fetch.mockResolvedValue({
      json: async () => ({ items: [provider, provider] }),
      ok: true,
    });
    await expect(
      getSSOProvider({ supabaseServiceRoleConfig: service }),
    ).rejects.toThrow("NOT_SUPPORTED");
  });
  it("creates URL/XML providers and rejects unsuccessful writes", async () => {
    const fetch = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    for (const metadata of [
      { metadata_url: "https://idp.test/metadata" },
      { metadata_xml: "<xml />" },
    ]) {
      await addSSOProvider(metadata, { supabaseServiceRoleConfig: service });
      const request = fetch.mock.lastCall![1] as any;
      expect(request.method).toBe("POST");
      expect(JSON.parse(request.body)).toEqual({ ...metadata, type: "saml" });
    }
    fetch.mockResolvedValue({ ok: false });
    await expect(
      addSSOProvider(
        { metadata_xml: "" },
        { supabaseServiceRoleConfig: service },
      ),
    ).rejects.toThrow("Could not add");
  });
  it.each(["update", "delete"])(
    "%s uses the discovered provider and checks write responses",
    async (operation) => {
      let ok = true;
      const fetch = vi.fn(async (_url: any, request: any) =>
        request.method
          ? { ok }
          : { ok: true, json: async () => ({ items: [provider] }) },
      );
      vi.stubGlobal("fetch", fetch);
      const run = () =>
        operation === "update"
          ? updateSSOProviderAttributeMappings(
              { keys: { first_name: { name: "givenName" } } },
              { supabaseServiceRoleConfig: service },
            )
          : deleteSSOProvider({ supabaseServiceRoleConfig: service });
      await run();
      expect(fetch.mock.lastCall![0]).toBe(
        "https://supabase.test/auth/v1/admin/sso/providers/provider",
      );
      expect(fetch.mock.lastCall![1].method).toBe(
        operation === "update" ? "PUT" : "DELETE",
      );
      ok = false;
      await expect(run()).rejects.toThrow(/Failed|Could not/);
    },
  );
});
describe("user directory reads", () => {
  const users = [
    {
      id: "a",
      email: "a@example.test",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: "2026-01-01",
    },
    {
      id: "b",
      app_metadata: { provider: "sso" },
      user_metadata: {},
      created_at: "2026-01-01",
    },
  ];
  const create = (
    profiles: any = [{ id: "a", first_name: "Ada", last_name: "Lovelace" }],
  ) => {
    const value = database({
      user_profiles: { data: profiles },
      user_roles: { data: [{ user_id: "a", role: "editor" }] },
    });
    (value.supabase as any).auth = {
      admin: {
        listUsers: vi.fn(async () => ({ data: { users } })),
        getUserById: vi.fn(async (id: string) => ({
          data: { user: users.find((x) => x.id === id) },
        })),
      },
    };
    return value;
  };
  it("joins profile records and workspace roles without dropping users lacking either", async () => {
    const { supabase, builders } = create();
    const listed = await getUsers({ supabaseServiceRole: supabase } as any);
    expect(listed[0].name).toBe("Ada Lovelace");
    expect(listed).toHaveLength(2);
    const scoped = await getUsersWithWorkspaceClaim("workspace", {
      supabaseServiceRole: supabase,
    } as any);
    expect(scoped[0].workspaceRole).toBe("editor");
    expect(scoped[1].workspaceRole).toBeUndefined();
    expect(builders.user_roles.eq).toHaveBeenCalledWith(
      "organization_id",
      "workspace",
    );
    expect(
      await getUsers({ supabaseServiceRole: create(null).supabase } as any),
    ).toHaveLength(2);
  });
  it("returns one user with nullable profile and rejects unknown IDs", async () => {
    const { supabase, builders } = create(null);
    expect(
      await getUserById("a", { supabaseServiceRole: supabase } as any),
    ).toMatchObject({ id: "a", email: "a@example.test" });
    expect(builders.user_profiles.eq).toHaveBeenCalledWith("id", "a");
    await expect(
      getUserById("absent", { supabaseServiceRole: supabase } as any),
    ).rejects.toThrow("NOT_FOUND");
  });
});
