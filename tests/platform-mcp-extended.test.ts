import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPlatformTools } from "../packages/realtime/src/platform/tools.ts";
import type { PlatformContext } from "../packages/realtime/src/platform/registry.ts";
const io = vi.hoisted(() => ({
  name: vi.fn(),
  avatar: vi.fn(),
  upload: vi.fn(),
  config: vi.fn(),
  sso: vi.fn(),
  createUser: vi.fn(),
}));
vi.mock("@schornio/aibox-database/user/updateUserProfileName", () => ({
  updateUserProfileName: io.name,
}));
vi.mock("@schornio/aibox-database/user/saveUserAvatar", () => ({
  saveUserAvatar: io.avatar,
}));
vi.mock("@schornio/aibox-database/storage/createAssetUpload", () => ({
  createAssetUpload: io.upload,
}));
vi.mock("@schornio/aibox-database/config/saveThemeSettings", () => ({
  saveThemeSettings: io.config,
}));
vi.mock("@schornio/aibox-database/sso/createSSOSettings", () => ({
  createSSOSettings: io.sso,
}));
vi.mock("@schornio/aibox-database/user/createUserWithResetKey", () => ({
  createUserWithResetKey: io.createUser,
}));
const me = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
function context(
  level: PlatformContext["level"] = "user",
  claims: PlatformContext["claims"] = [
    { organization_id: "workspace", role: "user" },
  ],
): PlatformContext {
  return {
    userId: me,
    level,
    claims,
    supabase: {} as any,
    supabaseServiceRole: {} as any,
    serverToken: "Worker test",
    websocketProvider: {} as any,
    getSsoConfig: () => ({
      supabaseUrl: "https://supabase.example",
      supabaseServiceRoleKey: "server-secret",
    }),
  };
}
function tool(name: string, c = context()) {
  const tool = createPlatformTools(c).find((t) => t.name === name);
  expect(tool, name).toBeDefined();
  return tool!;
}
beforeEach(() => {
  vi.clearAllMocks();
});
describe("extended platform permissions", () => {
  it("requires admin authority even with a reset key for another account", async () => {
    await expect(
      tool("platform_profile_password_reset").execute({
        userId: other,
        password: "example-password",
        passwordResetKey: "key",
      }),
    ).rejects.toThrow("NOT_AUTHORIZED");
  });
  it("binds own profile updates to the authenticated identity, ignoring injected IDs", async () => {
    await tool("platform_profile_name_update").execute({
      firstName: "Ada",
      lastName: "Lovelace",
      userId: other,
    });
    expect(io.name).toHaveBeenCalledWith(
      me,
      { firstName: "Ada", lastName: "Lovelace" },
      { supabaseServiceRole: {} },
    );
  });
  it("cannot set another account avatar through the self-service tool", async () => {
    await expect(
      tool("platform_profile_avatar_update").execute({
        avatarPath: `user_avatars/${other}/avatar.png`,
      }),
    ).rejects.toThrow("INVALID_AVATAR_PATH");
    expect(io.avatar).not.toHaveBeenCalled();
  });
  it.each(["theme", "xrag"])(
    "rejects a user requesting an administrator asset upload: %s",
    async (kind) => {
      await expect(
        tool("platform_asset_upload_url").execute({
          kind,
          fileName: "file.png",
        }),
      ).rejects.toThrow("NOT_AUTHORIZED");
      expect(io.upload).not.toHaveBeenCalled();
    },
  );
  it("rejects uploads for another user even when admin is configured but caller is only editor", async () => {
    const c = context("admin", [
      { organization_id: "workspace", role: "editor" },
    ]);
    await expect(
      tool("platform_asset_upload_url", c).execute({
        kind: "avatar",
        fileName: "avatar.png",
        userId: other,
      }),
    ).rejects.toThrow("NOT_AUTHORIZED");
    expect(io.upload).not.toHaveBeenCalled();
  });
  it("uses the protected avatar bucket with the authenticated owner", async () => {
    await tool("platform_asset_upload_url").execute({
      kind: "avatar",
      fileName: "avatar.png",
    });
    expect(io.upload).toHaveBeenCalledWith("user_avatars", me, "avatar.png", {
      supabase: {},
    });
  });
  it("does not let activity variants write repository files", async () => {
    await expect(
      tool("platform_activity_file_write").execute({
        repositoryId: "repo",
        path: "a.txt",
        text: "x",
      }),
    ).rejects.toThrow("ACTIVITY_STORAGE_REQUIRED");
    await expect(
      tool("platform_activity_file_transfer").execute({
        from: {
          storage: {
            type: "documentRepository",
            documentRepositoryId: "repo",
            workspaceId: "workspace",
          },
          path: "a.txt",
        },
        to: {
          storage: { type: "activity", agentId: "agent", activityId: me },
          folder: "",
        },
      }),
    ).rejects.toThrow("ACTIVITY_STORAGE_REQUIRED");
  });
  it("does not expose theme, SSO or account administration above actual permissions", () => {
    const names = createPlatformTools(
      context("admin", [{ organization_id: "workspace", role: "editor" }]),
    ).map((t) => t.name);
    for (const name of [
      "platform_theme_update",
      "platform_sso_create",
      "platform_user_create",
      "platform_user_reset_key",
    ])
      expect(names).not.toContain(name);
  });
  it("keeps the configured ceiling even for global administrators", () => {
    const names = createPlatformTools(context("user", "admin")).map(
      (t) => t.name,
    );
    expect(names).not.toContain("platform_sso_delete");
    expect(names).not.toContain("platform_file_write");
  });
  it("rechecks lost privileges immediately before a privileged operation", async () => {
    const c = context("admin", "admin");
    const t = tool("platform_sso_create", c);
    c.claims = [{ organization_id: "workspace", role: "user" }];
    await expect(t.execute({ metadataAsXML: "<metadata/>" })).rejects.toThrow(
      "NOT_AUTHORIZED",
    );
    expect(io.sso).not.toHaveBeenCalled();
  });
  it("shares the complete theme validation and operation with the UI", async () => {
    const c = context("admin", "admin");
    await expect(
      tool("platform_theme_update", c).execute({
        theme: {
          version: "theme-v2",
          logo: { de: { url: "javascript:alert(1)" } },
        },
        welcomeMessage: {},
        accessMessage: {},
      }),
    ).rejects.toThrow();
    expect(io.config).not.toHaveBeenCalled();
    const input = {
      theme: { version: "theme-v2" },
      welcomeMessage: { de: "Willkommen" },
      accessMessage: {},
    };
    await tool("platform_theme_update", c).execute(input);
    expect(io.config).toHaveBeenCalledWith(input, { supabase: {} });
  });
});
