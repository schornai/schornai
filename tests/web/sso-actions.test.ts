import { beforeEach, describe, expect, it, vi } from "vitest";
import { addSSOProvider } from "../../apps/web/app/(settings)/settings/sso/_actions/addSSOProvider";
import { deleteSSOProvider } from "../../apps/web/app/(settings)/settings/sso/_actions/deleteSSOProvider";
import { updateSAMLAttributeMapping } from "../../apps/web/app/(settings)/settings/sso/_actions/updateSAMLAttributeMapping";
const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
    action: (handler: any) => () => handler({}),
  },
}));
vi.mock("@/lib/supabase/saveGetSupabaseServiceRoleConfig", () => ({
  saveGetSupabaseServiceRoleConfig: async () => ({
    supabaseUrl: "https://supabase.test",
    supabaseServiceRoleKey: "service",
  }),
}));
vi.mock("@schornio/aibox-package-database/sso/addSSOProvider", () => ({
  addSSOProvider: mocks.add,
}));
vi.mock("@schornio/aibox-package-database/sso/deleteSSOProvider", () => ({
  deleteSSOProvider: mocks.remove,
}));
vi.mock(
  "@schornio/aibox-package-database/sso/updateSSOProviderAttributeMappings",
  () => ({ updateSSOProviderAttributeMappings: mocks.update }),
);
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
beforeEach(() => {
  for (const mock of Object.values(mocks))
    mock.mockReset().mockResolvedValue(undefined);
});
describe("SSO provider actions", () => {
  it.each([
    { metadataAsUrl: "https://idp.test/metadata", metadataAsXML: "<xml />" },
    { metadataAsUrl: "", metadataAsXML: "<xml />" },
  ])(
    "creates the provider from %j and installs default attribute mappings",
    async (input) => {
      await addSSOProvider(input);
      expect(mocks.add.mock.lastCall![0]).toEqual(
        input.metadataAsUrl
          ? { metadata_url: input.metadataAsUrl }
          : { metadata_xml: input.metadataAsXML },
      );
      expect(mocks.update.mock.lastCall![0].keys.groups.array).toBe(true);
      expect(Object.keys(mocks.update.mock.lastCall![0].keys)).toHaveLength(4);
      expect(mocks.revalidate).toHaveBeenCalledWith("/");
    },
  );
  it("rejects missing metadata before writing to Supabase", async () => {
    await expect(
      addSSOProvider({ metadataAsUrl: "", metadataAsXML: "" }),
    ).rejects.toThrow("INTERNAL_SERVER_ERROR");
    expect(mocks.add).not.toHaveBeenCalled();
  });
  it("deletes a provider and invalidates cached pages", async () => {
    await deleteSSOProvider();
    expect(mocks.remove).toHaveBeenCalledWith(
      expect.objectContaining({
        supabaseServiceRoleConfig: expect.any(Object),
      }),
    );
    expect(mocks.revalidate).toHaveBeenCalledWith("/");
  });
  it.each([
    {},
    {
      samlMappingAttributeFirstName: " given ",
      samlMappingAttributeLastName: " surname ",
      samlMappingAttributeAvatarUrl: " photo ",
      samlMappingAttributePermissionGroups: " groups ",
    },
    {
      samlMappingAttributeFirstName: "",
      samlMappingAttributeLastName: " ",
      samlMappingAttributeAvatarUrl: "",
      samlMappingAttributePermissionGroups: " ",
    },
  ])(
    "sanitizes mapping attributes and falls back to defaults for %j",
    async (input) => {
      await updateSAMLAttributeMapping(input);
      const keys = mocks.update.mock.lastCall![0].keys;
      for (const attribute of Object.values(keys) as any[])
        expect(attribute.name.length).toBeGreaterThan(0);
      if (input.samlMappingAttributeFirstName?.trim())
        expect(keys.firstName.name).toBe("given");
      expect(keys.groups.array).toBe(true);
      expect(mocks.revalidate).toHaveBeenCalledWith("/");
    },
  );
});
