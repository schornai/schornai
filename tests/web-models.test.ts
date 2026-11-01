import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSystemConfigTheme } from "../apps/web/app/_models/systemConfigTheme";
import { getSystemConfigSignIn } from "../apps/web/app/_models/systemConfigSignIn";
import { getSystemConfigWelcomeMessage } from "../apps/web/app/_models/systemConfigWelcomeMessage";
import { getSystemConfigDefaultModel } from "../apps/web/app/_models/systemConfigDefaultModel";
import { getCurrentUserConfigFavorites } from "../apps/web/app/_models/currentUserConfigFavorites";
import { getGroupSortViewPreferences } from "../apps/web/lib/groupSortView/model";
import { hasPermission } from "../apps/web/lib/hasPermission";
import { storageToAppBasePath } from "../apps/web/lib/storageToAppBasePath";
import { getTypeId } from "../apps/web/app/(main)/_utils/getTypeId";
import { getTypeLink } from "../apps/web/app/(main)/_utils/getTypeLink";
import manifest from "../apps/web/app/manifest";

const mocks = vi.hoisted(() => ({
  configs: {} as Record<string, unknown>,
  fail: false,
  system: vi.fn(),
  user: vi.fn(),
  model: vi.fn(),
  agents: vi.fn(),
  repositories: vi.fn(),
  transcribers: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock("next/cache", () => ({ cacheTag: mocks.cacheTag }));
vi.mock("@/lib/supabase/createSupabaseAnonClient", () => ({
  createSupabaseAnonClient: () => ({}),
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({}),
}));
vi.mock("@schornio/aibox-package-database/config/getSystemConfig", () => ({
  getSystemConfig: mocks.system,
}));
vi.mock("@schornio/aibox-package-database/config/getCurrentUserConfig", () => ({
  getCurrentUserConfig: mocks.user,
}));
vi.mock("@schornio/aibox-package-database/aiModel/getAIModelById", () => ({
  getAIModelById: mocks.model,
}));
vi.mock("@schornio/aibox-package-database/agent/getAgentsByIds", () => ({
  getAgentsByIds: mocks.agents,
}));
vi.mock(
  "@schornio/aibox-package-database/documentRepositories/getDocumentRepositoriesByIds",
  () => ({ getDocumentRepositoriesByIds: mocks.repositories }),
);
vi.mock(
  "@schornio/aibox-package-database/transcriber/getTranscribersByIds",
  () => ({ getTranscribersByIds: mocks.transcribers }),
);

beforeEach(() => {
  mocks.configs = {};
  mocks.fail = false;
  mocks.system.mockReset().mockImplementation(async (key) => {
    if (mocks.fail) throw new Error("unavailable");
    return mocks.configs[key];
  });
  mocks.user.mockReset().mockImplementation(async (key) => mocks.configs[key]);
  mocks.model.mockReset().mockResolvedValue({ identifier: "legacy-model" });
  mocks.agents.mockReset().mockResolvedValue([{ id: "agent" }]);
  mocks.repositories.mockReset().mockResolvedValue([{ id: "repo" }]);
  mocks.transcribers.mockReset().mockResolvedValue([{ id: "transcriber" }]);
});

describe("system config models", () => {
  it.each([undefined, "", "invalid json", '{"password":"invalid"}'])(
    "uses safe sign-in defaults for %j",
    async (config) => {
      mocks.configs.signIn = config;
      expect(await getSystemConfigSignIn()).toEqual({
        password: "visible",
        sso: "visible",
      });
    },
  );
  it("reads password and SSO visibility with optional display names", async () => {
    mocks.configs.signIn = JSON.stringify({
      password: "hidden",
      sso: "visible",
      ssoName: "Company",
    });
    expect(await getSystemConfigSignIn()).toEqual({
      password: "hidden",
      sso: "visible",
      ssoName: "Company",
    });
    mocks.configs.signIn = "{}";
    expect(await getSystemConfigSignIn()).toEqual({
      password: "visible",
      sso: "visible",
    });
    expect(mocks.cacheTag).toHaveBeenCalledWith("systemConfigSignIn");
  });
  it("reads localized welcome text and tolerates invalid or unavailable settings", async () => {
    mocks.configs.welcomeMessage = JSON.stringify({
      localized: { de: "Hallo", en: "Hello" },
    });
    expect(await getSystemConfigWelcomeMessage()).toEqual({
      de: "Hallo",
      en: "Hello",
    });
    mocks.configs.welcomeMessage = "invalid";
    expect(await getSystemConfigWelcomeMessage()).toBeUndefined();
    delete mocks.configs.welcomeMessage;
    expect(await getSystemConfigWelcomeMessage()).toBeUndefined();
    mocks.fail = true;
    expect(await getSystemConfigWelcomeMessage()).toBeUndefined();
  });
  it("migrates legacy theme logos and colors and preserves v2 themes", async () => {
    expect(await getSystemConfigTheme()).toEqual({ version: "theme-v2" });
    const color = { type: "color-oklch-hue", oklchHue: 100 };
    mocks.configs.theme = JSON.stringify({
      chatbot: { colors: [{ name: "Color", color }] },
      logo: { url: "/logo.svg" },
    });
    expect(await getSystemConfigTheme()).toEqual({
      version: "theme-v2",
      colors: [{ name: "Color", color, id: expect.any(String) }],
      logo: { de: { url: "/logo.svg" } },
    });
    mocks.configs.theme = "{}";
    expect(await getSystemConfigTheme()).toEqual({
      version: "theme-v2",
      colors: undefined,
      logo: undefined,
    });
    const theme = {
      version: "theme-v2",
      colors: [
        {
          id: "color",
          name: "Color",
          color: { type: "color-rgb", red: 1, green: 2, blue: 3, opacity: 0.5 },
        },
      ],
      logo: { en: { url: "/logo.svg", alt: "Logo" } },
    };
    mocks.configs.theme = JSON.stringify(theme);
    expect(await getSystemConfigTheme()).toEqual(theme);
  });
  it("uses the v2 model first, then the legacy ID, then no model", async () => {
    expect(await getSystemConfigDefaultModel()).toBeUndefined();
    mocks.configs.defaultOllamaModelId = "old";
    expect(await getSystemConfigDefaultModel()).toEqual({
      version: "default-model-v2",
      modelIdentifier: "legacy-model",
    });
    expect(mocks.model).toHaveBeenCalledWith("old", { supabase: {} });
    mocks.configs.defaultModel = JSON.stringify({
      version: "default-model-v2",
      modelIdentifier: "new",
    });
    expect(await getSystemConfigDefaultModel()).toEqual({
      version: "default-model-v2",
      modelIdentifier: "new",
    });
  });
});

describe("user configuration models", () => {
  it("uses empty favorites for absent or malformed config", async () => {
    expect(await getCurrentUserConfigFavorites()).toEqual({
      favorites: [],
      showInSidebar: true,
      version: "favorites-v2",
    });
    mocks.configs.favorites = { invalid: true };
    expect(await getCurrentUserConfigFavorites()).toEqual({
      favorites: [],
      showInSidebar: true,
      version: "favorites-v2",
    });
    expect(mocks.agents).not.toHaveBeenCalled();
  });
  it("migrates legacy favorites and resolves referenced items", async () => {
    mocks.configs.favorites = [
      { id: "agent", type: "chatbot" },
      { id: "transcriber", type: "transcriber" },
    ];
    expect(await getCurrentUserConfigFavorites()).toMatchObject({
      favorites: [
        { id: "agent", type: "agent" },
        { id: "transcriber", type: "transcriber" },
      ],
      showInSidebar: true,
      agents: [{ id: "agent" }],
      documentRepositories: [{ id: "repo" }],
    });
    expect(mocks.transcribers).toHaveBeenCalledWith(["agent", "transcriber"], {
      supabase: {},
    });
    mocks.configs.favorites = {
      favorites: [{ id: "repo", type: "documentRepository" }],
      showInSidebar: false,
      version: "favorites-v2",
    };
    expect(await getCurrentUserConfigFavorites()).toMatchObject({
      showInSidebar: false,
    });
  });
  it("reads and validates list preferences using the scoped settings key", async () => {
    expect(await getGroupSortViewPreferences("agents")).toBeUndefined();
    mocks.configs["groupSortView-agents"] = {
      view: "table",
      sort: "name:asc",
      group: "workspace",
    };
    expect(await getGroupSortViewPreferences("agents")).toEqual(
      mocks.configs["groupSortView-agents"],
    );
    mocks.configs["groupSortView-agents"] = { sort: 42 };
    expect(await getGroupSortViewPreferences("agents")).toBeUndefined();
  });
});

describe("navigation and permissions", () => {
  const roles = ["user", "editor", "workspace-admin", "admin"] as const;
  it.each(roles)("enforces all permission levels for %s", (claim) => {
    for (const permission of roles)
      expect(hasPermission({ claim, permission })).toBe(
        roles.indexOf(claim) >= roles.indexOf(permission),
      );
    expect(hasPermission({ permission: claim })).toBe(false);
  });
  it("maps all storage and activity types to their application routes", () => {
    expect(
      storageToAppBasePath({ type: "activity", agentId: "a", activityId: "b" }),
    ).toBe("/agent/a/b/files");
    expect(
      storageToAppBasePath({
        type: "activity-transcription",
        transcriberId: "t",
        activityId: "b",
      }),
    ).toBe("/app/transcribe/t/b/files");
    expect(
      storageToAppBasePath({
        type: "documentRepository",
        documentRepositoryId: "r",
      }),
    ).toBe("/app/documents/r/files");
    expect(storageToAppBasePath()).toBeUndefined();
    expect(getTypeLink({ type: "chat", chatbotId: "a" })).toBe("/agent/a");
    expect(getTypeId({ type: "chat", chatbotId: "a" })).toBe("a");
    expect(getTypeLink({ type: "transcription", transcriberId: "t" })).toBe(
      "/app/transcribe/t",
    );
    expect(getTypeId({ type: "transcription", transcriberId: "t" })).toBe("t");
    for (const value of [undefined, { type: "reindex" as const }]) {
      expect(getTypeLink(value)).toBe("not-set");
      expect(getTypeId(value)).toBe("not-set");
    }
    expect(manifest()).toMatchObject({
      display: "standalone",
      start_url: "/",
      name: "schorn.ai App",
    });
  });
});
