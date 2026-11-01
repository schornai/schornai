import { expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "../../packages/database/src/_shared/_types";
import { updateSAMLAttributeMapping } from "../../apps/web/app/(settings)/settings/sso/_actions/updateSAMLAttributeMapping";
import { updateProfileAvatar } from "../../apps/web/app/(settings)/_actions/updateProfileAvatar";
import { getCurrentUserProfile } from "../../packages/database/src/user/getCurrentUserProfile";

const state = vi.hoisted(() => ({
  supabase: undefined as unknown as SupabaseClient,
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("@/lib/supabase/saveGetSupabaseServiceRoleConfig", () => ({
  saveGetSupabaseServiceRoleConfig: async () => ({
    supabaseUrl: "https://supabase.test",
    supabaseServiceRoleKey: "test-service",
  }),
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => state.supabase,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

it("maps arbitrary SAML source attributes to stable profile keys and restores employeePhoto after deleting an own avatar", async () => {
  // Exercise the real settings action and provider API request. Only the
  // remote Supabase service and profile persistence are test boundaries.
  const fetch = vi.fn(async (_url: unknown, options?: RequestInit) =>
    options?.method === "PUT"
      ? { ok: true }
      : { ok: true, json: async () => ({ items: [{ id: "provider" }] }) },
  );
  vi.stubGlobal("fetch", fetch);
  await updateSAMLAttributeMapping({
    samlMappingAttributeFirstName: "employeeGivenName",
    samlMappingAttributeLastName: "urn:company:employeeSurname",
    samlMappingAttributeAvatarUrl: "employeePhoto",
    samlMappingAttributePermissionGroups: "employeeGroups",
  });
  expect(fetch).toHaveBeenLastCalledWith(
    "https://supabase.test/auth/v1/admin/sso/providers/provider",
    expect.objectContaining({ method: "PUT" }),
  );
  const payload = JSON.parse(fetch.mock.lastCall![1]!.body as string);
  expect(payload).toEqual({
    attribute_mapping: {
      keys: {
        firstName: { name: "employeeGivenName" },
        lastName: { name: "urn:company:employeeSurname" },
        avatarUrl: { name: "employeePhoto" },
        groups: { name: "employeeGroups", array: true },
      },
    },
  });

  const samlAttributes: Record<string, string | string[]> = {
    employeeGivenName: "Ada",
    "urn:company:employeeSurname": "Lovelace",
    employeePhoto: "https://idp.test/employees/ada.png",
    employeeGroups: ["Staff"],
  };
  // Model Supabase's documented mapping boundary: destination keys are kept
  // in custom_claims; `name` selects the source SAML attribute.
  const customClaims = Object.fromEntries(
    Object.entries(
      payload.attribute_mapping.keys as Record<string, { name: string }>,
    ).map(([key, { name }]) => [key, samlAttributes[name]]),
  );
  expect(customClaims).toEqual({
    firstName: "Ada",
    lastName: "Lovelace",
    avatarUrl: "https://idp.test/employees/ada.png",
    groups: ["Staff"],
  });
  expect(customClaims).not.toHaveProperty("employeePhoto");
  const user = {
    id: "sso-user",
    app_metadata: { provider: "sso:provider" },
    user_metadata: { custom_claims: customClaims },
  } as unknown as User;
  let profile: Record<string, unknown> | null = null;
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => builder,
    upsert: (values: Record<string, unknown>) => {
      profile = { ...profile, ...values };
      return builder;
    },
    throwOnError: async () => ({ data: profile }),
  };
  const remove = vi.fn(async () => ({ data: [], error: null }));
  state.supabase = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: () => builder,
    storage: { from: () => ({ remove }) },
  } as unknown as SupabaseClient;
  const readProfile = () => getCurrentUserProfile({ supabase: state.supabase });
  expect(await readProfile()).toMatchObject({
    firstName: "Ada",
    lastName: "Lovelace",
    avatarUrl: samlAttributes.employeePhoto,
    ownAvatarUrl: undefined,
  });
  const ownAvatar = "user_avatars/sso-user/upload.png";
  await updateProfileAvatar({ avatarUrl: ownAvatar });
  expect(await readProfile()).toMatchObject({
    firstName: "Ada",
    lastName: "Lovelace",
    avatarUrl: ownAvatar,
    ownAvatarUrl: ownAvatar,
  });
  expect(remove).not.toHaveBeenCalled();

  await updateProfileAvatar({});
  expect(profile).toEqual({ id: "sso-user", avatar_url: null });
  expect(remove).toHaveBeenCalledExactlyOnceWith(["sso-user/upload.png"]);
  expect(await readProfile()).toMatchObject({
    firstName: "Ada",
    lastName: "Lovelace",
    avatarUrl: samlAttributes.employeePhoto,
    ownAvatarUrl: undefined,
  });
  expect(user.user_metadata.custom_claims).toEqual(customClaims);
});
