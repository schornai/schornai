import { describe, expect, it, vi } from "vitest";
import { buildAccessToken } from "./buildAccessToken";
import { database } from "../../../../tests/helpers/supabase";
import type { AccessTokenWebhookBody } from "./_types";
import type { SupabaseClient } from "../_shared/_types";

const provider = "sso:11111111-1111-4111-8111-111111111111";
function setup({
  trusted = {},
  untrusted = {},
  organizations = [],
  roles = [],
  sso = true,
}: {
  trusted?: Record<string, unknown>;
  untrusted?: Record<string, unknown>;
  organizations?: Record<string, unknown>[];
  roles?: Record<string, unknown>[];
  sso?: boolean;
} = {}) {
  const { supabase, builders } = database({
    organizations: { data: organizations },
    user_roles: { data: roles },
  });
  builders.organizations!.eq.mockImplementation(
    (field: string, value: unknown) => ({
      then: (resolve: (result: unknown) => unknown) =>
        Promise.resolve({
          data: organizations.filter((org) => org[field] === value),
        }).then(resolve),
    }),
  );
  const user = {
    id: "u1",
    is_sso_user: sso,
    user_metadata: { custom_claims: untrusted },
    identities: [
      { user_id: "u1", provider, identity_data: { custom_claims: trusted } },
    ],
  };
  const getUserById = vi.fn(async () => ({ data: { user }, error: null }));
  const client = { ...supabase, auth: { admin: { getUserById } } };
  const event: AccessTokenWebhookBody = {
    user_id: "u1",
    claims: {
      app_metadata: { provider: sso ? provider : "email" },
      user_metadata: { custom_claims: untrusted },
    },
  };
  return {
    run: () =>
      buildAccessToken(event, {
        supabaseServiceRole: client as unknown as SupabaseClient,
      }),
    event,
    user,
    getUserById,
  };
}

describe("access-token role aggregation", () => {
  it.each(["admin", '"admin"', ["invalid", "admin"]])(
    "honors an Auth-managed SAML admin override %j",
    async (overrides) => {
      expect(await setup({ trusted: { overrides } }).run()).toBe("admin");
    },
  );

  it.each([true, false])(
    "ignores user-editable groups and administrator overrides (SSO: %j)",
    async (sso) => {
      const test = setup({
        sso,
        untrusted: { groups: ["admins"], overrides: "admin" },
        organizations: [{ id: "secret", saml_mapping_editor: "admins" }],
      });
      expect(await test.run()).toEqual([]);
      if (!sso) expect(test.getUserById).not.toHaveBeenCalled();
    },
  );

  it("does not trust SSO metadata without the matching Auth identity", async () => {
    const test = setup({ trusted: { overrides: "admin" } });
    test.user.identities[0]!.provider = "email";
    expect(await test.run()).toEqual([]);
    test.user.identities[0]!.provider = provider;
    test.user.identities[0]!.user_id = "other";
    expect(await test.run()).toEqual([]);
    test.user.identities[0]!.user_id = "u1";
    test.user.is_sso_user = false;
    expect(await test.run()).toEqual([]);
  });

  it("fails closed when the Auth identity lookup fails", async () => {
    const test = setup({ untrusted: { overrides: "admin" } });
    test.getUserById.mockResolvedValue({
      data: { user: null },
      error: { message: "private backend error" },
    } as never);
    await expect(test.run()).rejects.toThrow("Unable to verify SSO identity");
  });

  it("honors a database administrator independently of SAML groups", async () => {
    expect(await setup({ sso: false, roles: [{ role: "admin" }] }).run()).toBe(
      "admin",
    );
  });

  it("uses the user mapping, the editor mapping and nested group arrays", async () => {
    expect(
      await setup({
        trusted: { groups: [["read"], null, 42, ["edit"]] },
        organizations: [
          { id: "readers", saml_mapping_user: "read" },
          {
            id: "writers",
            saml_mapping_editor: "edit",
            saml_mapping_user: "read",
          },
        ],
      }).run(),
    ).toEqual([
      { organization_id: "readers", role: "user" },
      { organization_id: "writers", role: "editor" },
    ]);
  });

  it.each([
    { organization_id: "org", role: "editor" },
    '{"organization_id":"org","role":"editor"}',
    '[{"organization_id":"org","role":"editor"}]',
    [{ organization_id: "org", role: "editor" }, false],
  ])("accepts supported trusted override encodings %j", async (overrides) => {
    expect(await setup({ trusted: { overrides } }).run()).toEqual([
      { organization_id: "org", role: "editor" },
    ]);
  });

  it.each([undefined, null, 1, "invalid json", '{"role":"bad"}', false])(
    "ignores malformed overrides %j",
    async (overrides) => {
      expect(await setup({ trusted: { overrides } }).run()).toEqual([]);
    },
  );

  it("combines trusted groups, overrides, database roles and auto joins", async () => {
    expect(
      await setup({
        trusted: {
          groups: ["read"],
          overrides: [
            { organization_id: "readers", role: "editor" },
            { organization_id: "extra", role: "user" },
          ],
        },
        organizations: [
          { id: "readers", saml_mapping_user: "read", auto_join: true },
          { id: "auto", auto_join: true },
        ],
        roles: [
          { organization_id: "readers", role: "user" },
          { organization_id: "extra", role: "editor" },
          { organization_id: "db", role: "workspace-admin" },
          { role: "user" },
        ],
      }).run(),
    ).toEqual([
      { organization_id: "readers", role: "editor" },
      { organization_id: "extra", role: "editor" },
      { organization_id: "db", role: "workspace-admin" },
      { organization_id: "auto", role: "user" },
    ]);
  });
});
