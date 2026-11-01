import { describe, expect, it, vi } from "vitest";
import { buildAccessToken } from "./buildAccessToken";
import { database } from "../../../../tests/helpers/supabase";
import type { AccessTokenWebhookBody } from "./_types";
import type { SupabaseClient } from "../_shared/_types";

const payload = {
  user_id: "u1",
  claims: {
    app_metadata: { provider: "sso:provider-id" },
    user_metadata: {
      custom_claims: { overrides: "admin", groups: ["admins"] },
    },
  },
} as AccessTokenWebhookBody;
const workspace = (id = "own", mapping = "admins") => ({
  id,
  name: id,
  created_at: "2026-01-01",
  auto_join: true,
  saml_mapping_user: "read",
  saml_mapping_editor: "edit",
  description: JSON.stringify({
    version: "workspace-config-v1",
    description: "",
    samlMappingWorkspaceAdmin: mapping,
  }),
});
function client(
  claims: Record<string, unknown> = {},
  organizations: any[] | null = [],
  roles: any[] | null = [],
  provider = "sso:provider-id",
) {
  const { supabase, builders } = database({
    organizations: { data: organizations },
    user_roles: { data: roles },
  });
  builders.organizations!.eq.mockImplementation(
    (field: string, value: unknown) => ({
      then: (resolve: (result: unknown) => unknown) =>
        Promise.resolve({
          data: organizations?.filter((org) => org[field] === value),
        }).then(resolve),
    }),
  );
  const getUserById = vi.fn(async () => ({
    data: {
      user: {
        id: "u1",
        is_sso_user: true,
        identities: [
          { user_id: "u1", provider, identity_data: { custom_claims: claims } },
        ],
        user_metadata: payload.claims.user_metadata,
      },
    },
    error: null,
  }));
  Object.assign(supabase, { auth: { admin: { getUserById } } });
  return {
    supabaseServiceRole: supabase as unknown as SupabaseClient,
    getUserById,
  };
}

describe("access-token role aggregation", () => {
  it.each(["admin", '"admin"', ["invalid", "admin"]])(
    "honors trusted SAML admin override %j",
    async (overrides) => {
      expect(await buildAccessToken(payload, client({ overrides }))).toBe(
        "admin",
      );
    },
  );
  it("honors a global database administrator", async () => {
    expect(
      await buildAccessToken(
        payload,
        client({}, [], [{ role: "admin", organization_id: null }]),
      ),
    ).toBe("admin");
  });
  it("never turns a workspace-scoped legacy admin row into a global administrator", async () => {
    expect(
      await buildAccessToken(
        payload,
        client({}, [], [{ role: "admin", organization_id: "own" }]),
      ),
    ).toEqual([{ organization_id: "own", role: "workspace-admin" }]);
  });
  it.each(["email", "google"])(
    "ignores self-edited metadata and non-SAML identities (%s)",
    async (provider) => {
      expect(
        await buildAccessToken(
          payload,
          client(
            { overrides: "admin", groups: ["admins"] },
            [workspace()],
            [],
            provider,
          ),
        ),
      ).toEqual([{ organization_id: "own", role: "user" }]);
    },
  );
  it.each([
    ["admins", "edit", "read"],
    ["read", "edit", "admins"],
    [["read"], null, 42, ["admins", "edit"]],
  ])(
    "keeps the highest matching workspace role for groups %j",
    async (...groups) => {
      const result = await buildAccessToken(
        payload,
        client({ groups }, [
          workspace(),
          {
            ...workspace("other", "other-admins"),
            auto_join: false,
            saml_mapping_user: null,
            saml_mapping_editor: null,
          },
        ]),
      );
      expect(result).toEqual([
        { organization_id: "own", role: "workspace-admin" },
      ]);
    },
  );
  it("applies all three role mappings", async () => {
    expect(
      await buildAccessToken(
        payload,
        client({ groups: ["read", "edit", "admins"] }, [
          { ...workspace("reader", "absent"), saml_mapping_editor: null },
          workspace("writer", "absent"),
          workspace(),
        ]),
      ),
    ).toEqual([
      { organization_id: "reader", role: "user" },
      { organization_id: "writer", role: "editor" },
      { organization_id: "own", role: "workspace-admin" },
    ]);
  });
  it.each([
    { organization_id: "own", role: "workspace-admin" },
    '{"organization_id":"own","role":"workspace-admin"}',
    '[{"organization_id":"own","role":"workspace-admin"}]',
    [{ organization_id: "own", role: "workspace-admin" }, false],
  ])(
    "promotes group membership using trusted overrides %j",
    async (overrides) => {
      expect(
        await buildAccessToken(
          payload,
          client({ groups: "edit", overrides }, [workspace()]),
        ),
      ).toEqual([{ organization_id: "own", role: "workspace-admin" }]);
    },
  );
  it.each([undefined, null, 1, "invalid json", '{"role":"bad"}', false])(
    "ignores malformed overrides %j",
    async (overrides) => {
      expect(await buildAccessToken(payload, client({ overrides }))).toEqual(
        [],
      );
    },
  );
  it.each(["user", "editor", "workspace-admin"])(
    "does not downgrade SAML workspace-admin with database role %s",
    async (role) => {
      expect(
        await buildAccessToken(
          payload,
          client(
            {
              groups: "admins",
              overrides: { organization_id: "own", role: "user" },
            },
            [workspace()],
            [{ organization_id: "own", role }],
          ),
        ),
      ).toEqual([{ organization_id: "own", role: "workspace-admin" }]);
    },
  );
  it.each(["user", "editor"])(
    "promotes SAML %s with a database workspace-admin role",
    async (role) => {
      expect(
        await buildAccessToken(
          payload,
          client(
            { overrides: { organization_id: "own", role } },
            [workspace()],
            [{ organization_id: "own", role: "workspace-admin" }],
          ),
        ),
      ).toEqual([{ organization_id: "own", role: "workspace-admin" }]);
    },
  );
  it("re-evaluates changed mappings and removed identity groups on the next token", async () => {
    const organizations = [workspace()];
    const claims = { groups: ["admins"] };
    const db = client(claims, organizations);
    expect(await buildAccessToken(payload, db)).toEqual([
      { organization_id: "own", role: "workspace-admin" },
    ]);
    organizations[0] = workspace("own", "different-group");
    expect(await buildAccessToken(payload, db)).toEqual([
      { organization_id: "own", role: "user" },
    ]);
    organizations[0] = workspace();
    claims.groups = [];
    expect(await buildAccessToken(payload, db)).toEqual([
      { organization_id: "own", role: "user" },
    ]);
    expect(db.getUserById).toHaveBeenCalledWith("u1");
  });
  it("handles legacy descriptions, missing groups and absent query data", async () => {
    expect(await buildAccessToken(payload, client({}, null, null))).toEqual([]);
    expect(
      await buildAccessToken(
        payload,
        client({ groups: "read" }, [
          { ...workspace(), description: "Plain description" },
        ]),
      ),
    ).toEqual([{ organization_id: "own", role: "user" }]);
  });
  it("fails closed when the authoritative identity cannot be loaded", async () => {
    const db = client({ groups: "admins" }, [workspace()]);
    db.getUserById.mockResolvedValue({
      data: { user: null },
      error: { message: "unavailable" },
    } as any);
    await expect(buildAccessToken(payload, db)).rejects.toThrow(
      "Unable to verify SSO identity",
    );
  });
});
