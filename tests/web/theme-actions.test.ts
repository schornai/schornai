import { beforeEach, describe, expect, it, vi } from "vitest";
import { database } from "../helpers/supabase";
import { revalidatePath, updateTag } from "next/cache";
import {
  themeSettingsSchema,
  isThemeLogoUrl,
} from "../../apps/web/lib/themeSettings";

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
import { updateWelcomeMessage } from "../../apps/web/app/(settings)/settings/theme/_actions/updateWelcomeMessage";
import { updateTheme } from "../../apps/web/app/(settings)/settings/theme/_actions/updateTheme";
const theme = {
  version: "theme-v2" as const,
  colors: [
    {
      id: "brand",
      name: "Brand",
      color: { type: "color-oklch-hue" as const, oklchHue: 160 },
    },
  ],
  logo: { de: { url: "/logo.svg", alt: "Brand" } },
};
beforeEach(() => {
  state.claims = "admin";
  vi.clearAllMocks();
});

describe("theme settings action", () => {
  it.each([null, { key: "theme", value: "{}" }])(
    "persists a theme and invalidates consumers (existing row: %j)",
    async (data) => {
      const { supabase, builders } = database({ system_settings: { data } });
      state.service = supabase;
      await updateTheme(theme);
      if (data)
        expect(builders.system_settings.update).toHaveBeenCalledWith({
          value: JSON.stringify(theme),
        });
      else
        expect(builders.system_settings.insert).toHaveBeenCalledWith({
          key: "theme",
          value: JSON.stringify(theme),
        });
      expect(updateTag).toHaveBeenCalledWith("systemConfigTheme");
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    },
  );
  it.each([[], [{ organization_id: "workspace", role: "admin" }], undefined])(
    "rejects non-system-admin claims %j before accessing privileged data",
    async (claims) => {
      state.claims = claims;
      await expect(updateTheme(theme)).rejects.toThrow("NOT_AUTHORIZED");
      expect(state.createService).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
    },
  );
  it("propagates storage failure without invalidating the saved theme", async () => {
    state.service = database({
      system_settings: { error: new Error("offline") },
    }).supabase;
    await expect(updateTheme(theme)).rejects.toThrow("offline");
    expect(updateTag).not.toHaveBeenCalled();
  });
  it("rejects malformed values before creating the admin client", async () => {
    await expect(
      updateTheme({
        ...theme,
        colors: [
          {
            ...theme.colors[0],
            color: { type: "color-oklch-hue", oklchHue: 361 },
          },
        ],
      }),
    ).rejects.toThrow();
    expect(state.createService).not.toHaveBeenCalled();
  });
});

describe("theme input validation", () => {
  it.each([-1, 361, NaN, Infinity])("rejects invalid hues %s", (oklchHue) => {
    expect(
      themeSettingsSchema.safeParse({
        ...theme,
        colors: [
          { ...theme.colors[0], color: { type: "color-oklch-hue", oklchHue } },
        ],
      }).success,
    ).toBe(false);
  });
  it("rejects duplicate IDs, blank names, out-of-range RGB and opacity", () => {
    expect(
      themeSettingsSchema.safeParse({
        ...theme,
        colors: [...theme.colors, ...theme.colors],
      }).success,
    ).toBe(false);
    expect(
      themeSettingsSchema.safeParse({
        ...theme,
        colors: [{ ...theme.colors[0], name: " " }],
      }).success,
    ).toBe(false);
    for (const color of [
      { type: "color-rgb", red: 256, green: 0, blue: 0 },
      { type: "color-rgb", red: 0, green: 0, blue: 0, opacity: 2 },
    ])
      expect(
        themeSettingsSchema.safeParse({
          ...theme,
          colors: [{ ...theme.colors[0], color }],
        }).success,
      ).toBe(false);
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "//example.com/a.svg",
    "/\\example.com/a.svg",
    "not a URL",
  ])("rejects unsafe or malformed logo URL %s", (url) => {
    expect(isThemeLogoUrl(url)).toBe(false);
  });
  it.each([
    "/logo.svg",
    "https://example.com/logo.svg",
    "http://localhost/logo.svg",
  ])("accepts supported logo URL %s", (url) => {
    expect(isThemeLogoUrl(url)).toBe(true);
  });
  it("supports a reset and an explicitly empty palette", () => {
    expect(themeSettingsSchema.parse({ version: "theme-v2" })).toEqual({
      version: "theme-v2",
    });
    expect(themeSettingsSchema.parse({ ...theme, colors: [] }).colors).toEqual(
      [],
    );
  });
});

const { updateWelcomeMessage } =
  await import("../../apps/web/app/(settings)/settings/theme/_actions/updateWelcomeMessage");

describe("welcome text settings action", () => {
  it.each([null, { key: "welcomeMessage", value: "{}" }])(
    "saves localized markdown, removes empty overrides and refreshes both pages (existing: %j)",
    async (data) => {
      const { supabase, builders } = database({ system_settings: { data } });
      state.service = supabase;
      await updateWelcomeMessage({
        localized: { de: "# Willkommen\n\n**Hallo**", en: "  ", fr: "Bonjour" },
      });
      const value = JSON.stringify({
        localized: { de: "# Willkommen\n\n**Hallo**", fr: "Bonjour" },
      });
      if (data)
        expect(builders.system_settings.update).toHaveBeenCalledWith({ value });
      else
        expect(builders.system_settings.insert).toHaveBeenCalledWith({
          key: "welcomeMessage",
          value,
        });
      expect(updateTag).toHaveBeenCalledWith("systemConfigWelcomeMessage");
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    },
  );
  it("denies non-admins before creating a privileged client", async () => {
    state.claims = [];
    await expect(
      updateWelcomeMessage({ localized: { de: "Text" } }),
    ).rejects.toThrow("NOT_AUTHORIZED");
    expect(state.createService).not.toHaveBeenCalled();
  });
  it("rejects oversized text before accessing the database", async () => {
    await expect(
      updateWelcomeMessage({ localized: { de: "a".repeat(20001) } }),
    ).rejects.toThrow();
    expect(state.createService).not.toHaveBeenCalled();
  });
  it("allows returning to the built-in text", async () => {
    const { supabase, builders } = database({ system_settings: { data: {} } });
    state.service = supabase;
    await updateWelcomeMessage({ localized: {} });
    expect(builders.system_settings.update).toHaveBeenCalledWith({
      value: '{"localized":{}}',
    });
  });
});
