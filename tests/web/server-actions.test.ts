import { beforeEach, describe, expect, it, vi } from "vitest";
import { database } from "../helpers/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
const state = vi.hoisted(() => ({
  db: undefined as any,
  service: undefined as any,
}));
// Unit boundary for next-safe-action: retain real Zod validation and action logic.
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
    action: (handler: any) => () => handler({ parsedInput: undefined }),
  },
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => state.db,
}));
vi.mock("@/lib/supabase/saveCreateSupabaseServiceRoleClient", () => ({
  saveCreateSupabaseServiceRoleClient: async () => state.service,
}));
vi.mock("@/lib/supabase/getWorkspaceAdminContext", () => ({
  getWorkspaceAdminContext: async () => ({
    supabaseServiceRole: state.service,
    isGlobalAdmin: true,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
const authUser = {
  id: "current-user",
  created_at: "2025-01-01",
  app_metadata: { provider: "email" },
  user_metadata: {},
};
let builders: any;
const avatarRemove = vi.fn();
beforeEach(() => {
  ({ supabase: state.db, builders } = database({
    chatbots: {
      data: { ...agent, organization_id: "workspace", config: agent },
    },
    databases: { data: {} },
    transcribers: {
      data: { id: "transcriber", organization_id: "workspace", config: {} },
    },
    user_profiles: { data: { avatar_url: "previous.png" } },
    user_roles: { data: null },
    organizations: { data: { description: "{}" } },
    settings_user: { data: null },
  }));
  state.db.auth = {
    getClaims: async () => ({
      data: { claims: { organization_roles: "admin" } },
      error: null,
    }),
    getUser: vi.fn(async () => ({ data: { user: authUser }, error: null })),
    signOut: vi.fn(),
    signInWithPassword: vi.fn(async () => ({ error: null })),
    signInWithSSO: vi.fn(async () => ({
      data: { url: "https://idp.test/login" },
      error: null,
    })),
    admin: {
      getUserById: vi.fn(async (id: string) => ({
        data: { user: { ...authUser, id } },
      })),
    },
  };
  state.db.storage = { from: vi.fn(() => ({ remove: avatarRemove })) };
  state.service = state.db;
  vi.mocked(redirect).mockClear();
  vi.mocked(revalidatePath).mockClear();
  avatarRemove.mockClear();
});
const agent = {
  id: "agent",
  name: "Agent",
  description: "Description",
  workspaceId: "workspace",
  version: "agent-config-version-4",
  additionalFunctions: {},
  color: { type: "color-oklch-hue", oklchHue: 250 },
  icon: { type: "icon-lucide", iconName: "bot" },
  documentation: "",
  modelIdentifier: "model",
  modelThinking: "optional-on",
  recommendedMessages: [],
  roles: [],
};
const repo = {
  id: "repo",
  name: "Repository",
  description: "",
  workspaceId: "workspace",
  type: "database-v2",
  identifier: "repository",
};
const transcriber = {
  id: "transcriber",
  identifier: "whisper",
  name: "Transcriber",
  workspaceId: "workspace",
  version: "transcriber-v2",
};
const entities = [
  [
    "documentRepository",
    "databases",
    "../../apps/web/app/(main)/app/documents/_actions/",
    repo,
    "documentRepositoryId",
    "/app/documents",
  ],
  [
    "transcriber",
    "transcribers",
    "../../apps/web/app/(main)/app/transcribe/_actions/",
    transcriber,
    "transcriberId",
    "/app/transcribe",
  ],
] as const;
for (const [name, table, dir, entity, idKey, route] of entities) {
  const title = name[0].toUpperCase() + name.slice(1);
  describe(`${name} server actions`, () => {
    it("creates valid entities and navigates to the persisted ID", async () => {
      const action = (await import(`${dir}create${title}.ts`))[
        `create${title}`
      ];
      await action({ [name]: entity });
      const inserted = builders[table].insert.mock.lastCall[0];
      expect(inserted.name).toBe(entity.name);
      expect(inserted.organization_id).toBe("workspace");
      expect(redirect).toHaveBeenCalledWith(`${route}/${inserted.id}`);
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });
    it("updates the correct entity and rejects invalid payloads before any write", async () => {
      const action = (await import(`${dir}update${title}.ts`))[
        `update${title}`
      ];
      await action({ [name]: entity });
      expect(builders[table].eq).toHaveBeenCalledWith("id", entity.id);
      expect(builders[table].update).toHaveBeenCalledOnce();
      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(() => action({ [name]: { name: 123 } })).toThrow();
      expect(builders[table].update).toHaveBeenCalledOnce();
    });
    it("deletes only the requested entity and navigates back to its collection", async () => {
      await (
        await import(`${dir}delete${title}.ts`)
      )[`delete${title}`]({ [idKey]: "delete-me" });
      expect(builders[table].delete).toHaveBeenCalledOnce();
      expect(builders[table].eq).toHaveBeenCalledWith("id", "delete-me");
      expect(redirect).toHaveBeenCalledWith(route);
    });
  });
}
describe("authentication actions", () => {
  it("signs in and defaults to the dashboard or honors the requested destination", async () => {
    const { signInWithPassword } =
      await import("../../apps/web/app/signin/_actions/signInWithPassword");
    await signInWithPassword({
      email: "user@example.test",
      password: "secret",
    });
    expect(redirect).toHaveBeenLastCalledWith("/");
    await signInWithPassword({
      email: "user@example.test",
      password: "secret",
      next: "/agent",
    });
    expect(redirect).toHaveBeenLastCalledWith("/agent");
    expect(state.db.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.test",
      password: "secret",
    });
    expect(() => signInWithPassword({ email: "bad", password: "" })).toThrow();
    state.db.auth.signInWithPassword.mockResolvedValue({
      error: new Error("invalid"),
    });
    await expect(
      signInWithPassword({ email: "user@example.test", password: "bad" }),
    ).rejects.toThrow("Unauthorized");
  });
  it("redirects SSO to the provider and reports auth failure", async () => {
    vi.stubEnv("SITE_URL", "https://aibox.test");
    const { signInWithSSO } =
      await import("../../apps/web/app/signin/_actions/signInWithSSO");
    const providerId = crypto.randomUUID();
    await signInWithSSO({ providerId });
    expect(state.db.auth.signInWithSSO).toHaveBeenCalledWith({
      providerId,
      options: { redirectTo: "https://aibox.test/api/auth/callback" },
    });
    expect(redirect).toHaveBeenCalledWith("https://idp.test/login");
    state.db.auth.signInWithSSO.mockResolvedValue({ error: "failed" });
    await expect(signInWithSSO({ providerId })).rejects.toThrow("Unauthorized");
  });
  it("signs out the current session", async () => {
    await (await import("../../apps/web/app/_actions/signOut")).signOut();
    expect(state.db.auth.signOut).toHaveBeenCalledOnce();
  });
});
describe("profile and permissions actions", () => {
  it.each([undefined, "target-user"])(
    "updates names for target %s with empty defaults",
    async (targetUserId) => {
      await (
        await import("../../apps/web/app/(settings)/_actions/updateProfileName")
      ).updateProfileName({ targetUserId });
      expect(builders.user_profiles.upsert).toHaveBeenCalledWith(
        { id: targetUserId ?? "current-user", first_name: "", last_name: "" },
        { onConflict: "id" },
      );
    },
  );
  it.each([
    [undefined, "new.png"],
    [undefined, undefined],
    ["target-user", "new.png"],
    ["target-user", undefined],
  ])(
    "updates/removes avatars for %s to %s",
    async (targetUserId, avatarUrl) => {
      await (
        await import("../../apps/web/app/(settings)/_actions/updateProfileAvatar")
      ).updateProfileAvatar({ targetUserId, avatarUrl });
      expect(avatarRemove).toHaveBeenCalledWith(["previous.png"]);
      expect(builders.user_profiles.upsert).toHaveBeenCalledWith(
        { id: targetUserId ?? "current-user", avatar_url: avatarUrl ?? null },
        { onConflict: "id" },
      );
    },
  );
  it("avoids removing a nonexistent prior avatar", async () => {
    const { supabase, builders: fresh } = database({
      user_profiles: { data: null },
    });
    state.db.from = supabase.from;
    await (
      await import("../../apps/web/app/(settings)/_actions/updateProfileAvatar")
    ).updateProfileAvatar({ avatarUrl: "new.png" });
    expect(avatarRemove).not.toHaveBeenCalled();
    expect(fresh.user_profiles.upsert).toHaveBeenCalled();
  });
  it("defaults missing permissions to none and rejects unknown roles", async () => {
    const { updatePermission } =
      await import("../../apps/web/app/(settings)/settings/_actions/updatePermission");
    await updatePermission({ userId: "u", workspaceId: "w" });
    expect(builders.user_roles.delete).toHaveBeenCalled();
    expect(() =>
      updatePermission({
        userId: "u",
        workspaceId: "w",
        role: "superhero" as any,
      }),
    ).toThrow();
  });
});
describe("workspace and favorites actions", () => {
  it("updates descriptions with empty defaults", async () => {
    await (
      await import("../../apps/web/app/(settings)/settings/workspace/_actions/updateDescription")
    ).updateDescription({ workspaceId: "w" });
    expect(builders.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: "" }),
    );
    expect(builders.organizations.eq).toHaveBeenCalledWith("id", "w");
  });
  it("persists documentation and automatic join settings", async () => {
    await (
      await import("../../apps/web/app/(settings)/settings/workspace/_actions/updateDocumentation")
    ).updateDocs({ workspaceId: "w", docs: "Help" });
    expect(
      JSON.parse(builders.organizations.update.mock.lastCall[0].description)
        .documentation,
    ).toBe("Help");
    await (
      await import("../../apps/web/app/(settings)/settings/workspace/_actions/updateAutoJoin")
    ).updateAutoJoin({ workspaceId: "w", autoJoin: true });
    expect(builders.organizations.update).toHaveBeenLastCalledWith({
      auto_join: true,
    });
  });
  it("persists all SSO role mapping fields", async () => {
    await (
      await import("../../apps/web/app/(settings)/settings/workspace/_actions/updateSSOMapping")
    ).updateSSOMapping({
      workspaceId: "w",
      samlMappingWorkspaceAdmin: "admins",
      samlMappingEditor: "editors",
      samlMappingUser: "users",
    });
    expect(builders.organizations.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        saml_mapping_editor: "editors",
        saml_mapping_user: "users",
        description: expect.stringContaining("admins"),
      }),
    );
  });
  it("writes favorites through the current-user configuration namespace", async () => {
    await (
      await import("../../apps/web/app/(main)/_actions/updateFavorite")
    ).updateFavorite({
      favorites: [{ type: "workspace", id: "workspace" }],
      version: "favorites-v2",
    });
    expect(builders.settings_user.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "favorites",
        value: expect.objectContaining({
          version: "favorites-v2",
          favorites: [{ type: "workspace", id: "workspace" }],
        }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("SSO avatar overrides", () => {
  it.each([undefined, "target-user"])(
    "uploads and deletes an override with no initial profile for %s",
    async (targetUserId) => {
      const id = targetUserId ?? "current-user";
      const ssoUser = {
        ...authUser,
        id,
        app_metadata: { provider: "sso:provider" },
        user_metadata: {
          custom_claims: {
            firstName: "SSO",
            lastName: "Name",
            avatarUrl: "https://idp.test/avatar.png",
          },
        },
      };
      state.db.auth.getUser.mockResolvedValue({
        data: { user: ssoUser },
        error: null,
      });
      state.db.auth.admin.getUserById.mockResolvedValue({
        data: { user: ssoUser },
      });
      let row: any = null;
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: () => builder,
        upsert: (values: any) => {
          row = { ...row, ...values };
          return builder;
        },
        throwOnError: async () => ({ data: row }),
      };
      state.db.from = () => builder;
      const { updateProfileAvatar } =
        await import("../../apps/web/app/(settings)/_actions/updateProfileAvatar");
      const { getCurrentUserProfile } =
        await import("../../packages/database/src/user/getCurrentUserProfile");
      const read = () => getCurrentUserProfile({ supabase: state.db });
      expect((await read()).avatarUrl).toBe("https://idp.test/avatar.png");
      const avatarUrl = `user_avatars/${id}/own.png`;
      await updateProfileAvatar({ targetUserId, avatarUrl });
      expect(avatarRemove).not.toHaveBeenCalled();
      expect(await read()).toMatchObject({
        firstName: "SSO",
        lastName: "Name",
        avatarUrl,
        ownAvatarUrl: avatarUrl,
      });
      await updateProfileAvatar({ targetUserId, avatarUrl });
      expect(avatarRemove).not.toHaveBeenCalled();
      await updateProfileAvatar({ targetUserId });
      expect(avatarRemove).toHaveBeenCalledWith([`${id}/own.png`]);
      expect(await read()).toMatchObject({
        avatarUrl: "https://idp.test/avatar.png",
        ownAvatarUrl: undefined,
        firstName: "SSO",
        lastName: "Name",
      });
      avatarRemove.mockClear();
      await updateProfileAvatar({ targetUserId });
      expect(avatarRemove).not.toHaveBeenCalled();
    },
  );
});

it.each(["https://evil.test", "//evil.test", "javascript:alert(1)"])(
  "does not follow external login destination %s",
  async (next) => {
    const { signInWithPassword } =
      await import("../../apps/web/app/signin/_actions/signInWithPassword");
    await signInWithPassword({
      email: "a@example.com",
      password: "secret",
      next,
    });
    expect(redirect).toHaveBeenLastCalledWith("/");
  },
);

describe("agent server actions", () => {
  it("creates through the credential transaction and redirects to the persisted ID", async () => {
    const { createAgent } =
      await import("../../apps/web/app/(main)/agent/_actions/createAgent");
    await createAgent({ agent });
    const [operation, args] = state.service.rpc.mock.lastCall;
    expect(operation).toBe("save_agent_with_mcp_credentials");
    expect(args).toMatchObject({
      p_name: agent.name,
      p_workspace_id: "workspace",
    });
    expect(redirect).toHaveBeenCalledWith(`/agent/${args.p_agent_id}`);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
  it("updates the authorized agent and validates before writing", async () => {
    const { updateAgent } =
      await import("../../apps/web/app/(main)/agent/_actions/updateAgent");
    await updateAgent({ agent });
    expect(state.service.rpc).toHaveBeenCalledWith(
      "save_agent_with_mcp_credentials",
      expect.objectContaining({
        p_agent_id: "agent",
        p_expected_workspace_id: "workspace",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/agent/agent", "layout");
    expect(() => updateAgent({ agent: { name: 123 } } as any)).toThrow();
    expect(state.service.rpc).toHaveBeenCalledOnce();
  });
  it("deletes only the requested agent and returns to the collection", async () => {
    const { deleteAgent } =
      await import("../../apps/web/app/(main)/agent/_actions/deleteAgent");
    await deleteAgent({ agentId: "delete-me" });
    expect(builders.chatbots.delete).toHaveBeenCalledOnce();
    expect(builders.chatbots.eq).toHaveBeenCalledWith("id", "delete-me");
    expect(redirect).toHaveBeenCalledWith("/agent");
  });
});
