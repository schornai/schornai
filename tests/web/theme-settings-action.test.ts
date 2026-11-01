import { beforeEach, expect, it, vi } from "vitest";
import { database } from "../helpers/supabase";
import { revalidatePath, updateTag } from "next/cache";

const state = vi.hoisted(() => ({
  claims: "admin" as unknown,
  service: undefined as any,
  createService: vi.fn(),
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => async (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getClaims: async () => ({
        data: { claims: { organization_roles: state.claims } },
        error: null,
      }),
    },
  }),
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: () => {
    state.createService();
    return state.service;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
import { updateThemeSettings } from "../../apps/web/app/(settings)/settings/theme/_actions/updateThemeSettings";

const input = {
  theme: { version: "theme-v2" as const },
  welcomeMessage: { de: "Welcome", en: "  " },
  accessMessage: { de: { subject: "Access", body: "Hello {{firstName}}" } },
};
beforeEach(() => {
  vi.clearAllMocks();
  state.claims = "admin";
});

it("saves all sections in a single atomic upsert and invalidates all consumers", async () => {
  const { supabase, builders } = database({ system_settings: {} });
  state.service = supabase;
  await updateThemeSettings(input);
  expect(supabase.from).toHaveBeenCalledTimes(1);
  expect(builders.system_settings.upsert).toHaveBeenCalledExactlyOnceWith(
    [
      { key: "theme", value: JSON.stringify(input.theme) },
      {
        key: "welcomeMessage",
        value: JSON.stringify({ localized: { de: "Welcome" } }),
      },
      {
        key: "accessMessage",
        value: JSON.stringify({ localized: input.accessMessage }),
      },
    ],
    { onConflict: "key" },
  );
  expect(updateTag).toHaveBeenCalledWith("systemConfigTheme");
  expect(updateTag).toHaveBeenCalledWith("systemConfigWelcomeMessage");
  expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  expect(revalidatePath).toHaveBeenCalledWith("/settings/user/new");
});
it.each([undefined, [], [{ organization_id: "workspace", role: "admin" }]])(
  "rejects non-global-admin claims before creating a privileged client: %j",
  async (claims) => {
    state.claims = claims;
    await expect(updateThemeSettings(input)).rejects.toThrow("NOT_AUTHORIZED");
    expect(state.createService).not.toHaveBeenCalled();
  },
);
it("validates every section before writing anything", async () => {
  await expect(
    updateThemeSettings({
      ...input,
      accessMessage: { de: { subject: "Access", body: "{{unknown}}" } },
    }),
  ).rejects.toThrow();
  expect(state.createService).not.toHaveBeenCalled();
});
it("propagates a failed batch without invalidating any saved values", async () => {
  state.service = database({
    system_settings: { error: new Error("offline") },
  }).supabase;
  await expect(updateThemeSettings(input)).rejects.toThrow("offline");
  expect(updateTag).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
});
