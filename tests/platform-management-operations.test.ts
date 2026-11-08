import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPlatformTools } from "../packages/realtime/src/platform/tools.ts";
import type { PlatformContext } from "../packages/realtime/src/platform/registry.ts";
import {
  platformPreviewAgent as agent,
  platformPreviewRepository as repository,
} from "../apps/web/.storybook/platform-tool-fixtures";
const io = vi.hoisted(() => ({
  getWorkspaces: vi.fn(),
  getAgents: vi.fn(),
  getAgentById: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  getDocumentRepositories: vi.fn(),
  getDocumentRepositoryById: vi.fn(),
  createDocumentRepository: vi.fn(),
  updateDocumentRepository: vi.fn(),
  deleteDocumentRepository: vi.fn(),
  getTranscribers: vi.fn(),
  getTranscriberById: vi.fn(),
  createTranscriber: vi.fn(),
  updateTranscriber: vi.fn(),
  deleteTranscriber: vi.fn(),
  getAIModels: vi.fn(),
  createWorkspace: vi.fn(),
  updateWorkspaceDescription: vi.fn(),
  updateWorkspaceDocumentation: vi.fn(),
  getUsers: vi.fn(),
  updateUserPermission: vi.fn(),
  saveConnectionSettings: vi.fn(),
  listArtifacts: vi.fn(),
  createExternalAIModel: vi.fn(),
  updateExternalAIModel: vi.fn(),
  updateAIModelMetadata: vi.fn(),
  deleteAIModel: vi.fn(),
  updateWorkspaceAutoJoin: vi.fn(),
  updateWorkspaceSSOMapping: vi.fn(),
  toggleAdmin: vi.fn(),
  updateUserProfileName: vi.fn(),
  listConnections: vi.fn(),
  deleteConnection: vi.fn(),
  createSSOSettings: vi.fn(),
  saveSSOAttributeMapping: vi.fn(),
  saveThemeSettings: vi.fn(),
  getSystemConfig: vi.fn(),
  getSSOProvider: vi.fn(),
  deleteSSOProvider: vi.fn(),
  getSAMLMetadata: vi.fn(),
  createUserWithResetKey: vi.fn(),
  reissuePasswordResetKey: vi.fn(),
  getExternalAIModelConnection: vi.fn(),
  uploadAsset: vi.fn(),
  redeemPasswordResetKey: vi.fn(),
  getUserById: vi.fn(),
  saveUserAvatar: vi.fn(),
  getCurrentUserConfig: vi.fn(),
  setUserConfig: vi.fn(),
  listMCPOAuthConnections: vi.fn(),
  deleteMCPOAuthConnection: vi.fn(),
  createAssetUpload: vi.fn(),
  getUserIsAdmin: vi.fn(),
  getWorkspacesWithUserClaim: vi.fn(),
  getUsersWithWorkspaceClaim: vi.fn(),
  discover: vi.fn(),
  publish: vi.fn(),
  removeArtifact: vi.fn(),
}));
vi.mock("../packages/database/src/xrag/publishArtifact.ts", () => ({
  publishArtifact: io.publish,
}));
vi.mock("@schornio/aibox-database/workspace/getWorkspaces", () => ({
  getWorkspaces: io.getWorkspaces,
}));
vi.mock("@schornio/aibox-database/agent/getAgents", () => ({
  getAgents: io.getAgents,
}));
vi.mock("@schornio/aibox-database/agent/getAgentById", () => ({
  getAgentById: io.getAgentById,
}));
vi.mock("@schornio/aibox-database/agent/createAgent", () => ({
  createAgent: io.createAgent,
}));
vi.mock("@schornio/aibox-database/agent/updateAgent", () => ({
  updateAgent: io.updateAgent,
}));
vi.mock("@schornio/aibox-database/agent/deleteAgent", () => ({
  deleteAgent: io.deleteAgent,
}));
vi.mock(
  "@schornio/aibox-database/documentRepositories/getDocumentRepositories",
  () => ({ getDocumentRepositories: io.getDocumentRepositories }),
);
vi.mock(
  "@schornio/aibox-database/documentRepositories/getDocumentRepositoryById",
  () => ({ getDocumentRepositoryById: io.getDocumentRepositoryById }),
);
vi.mock(
  "@schornio/aibox-database/documentRepositories/createDocumentRepository",
  () => ({ createDocumentRepository: io.createDocumentRepository }),
);
vi.mock(
  "@schornio/aibox-database/documentRepositories/updateDocumentRepository",
  () => ({ updateDocumentRepository: io.updateDocumentRepository }),
);
vi.mock(
  "@schornio/aibox-database/documentRepositories/deleteDocumentRepository",
  () => ({ deleteDocumentRepository: io.deleteDocumentRepository }),
);
vi.mock("@schornio/aibox-database/transcriber/getTranscribers", () => ({
  getTranscribers: io.getTranscribers,
}));
vi.mock("@schornio/aibox-database/transcriber/getTranscriberById", () => ({
  getTranscriberById: io.getTranscriberById,
}));
vi.mock("@schornio/aibox-database/transcriber/createTranscriber", () => ({
  createTranscriber: io.createTranscriber,
}));
vi.mock("@schornio/aibox-database/transcriber/updateTranscriber", () => ({
  updateTranscriber: io.updateTranscriber,
}));
vi.mock("@schornio/aibox-database/transcriber/deleteTranscriber", () => ({
  deleteTranscriber: io.deleteTranscriber,
}));
vi.mock("@schornio/aibox-database/aiModel/getAIModels", () => ({
  getAIModels: io.getAIModels,
}));
vi.mock("@schornio/aibox-database/workspace/createWorkspace", () => ({
  createWorkspace: io.createWorkspace,
}));
vi.mock(
  "@schornio/aibox-database/workspace/updateWorkspaceDescription",
  () => ({ updateWorkspaceDescription: io.updateWorkspaceDescription }),
);
vi.mock(
  "@schornio/aibox-database/workspace/updateWorkspaceDocumentation",
  () => ({ updateWorkspaceDocumentation: io.updateWorkspaceDocumentation }),
);
vi.mock("@schornio/aibox-database/user/getUsers", () => ({
  getUsers: io.getUsers,
}));
vi.mock("@schornio/aibox-database/user/updateUserPermission", () => ({
  updateUserPermission: io.updateUserPermission,
}));
vi.mock("@schornio/aibox-database/connections/saveConnectionSettings", () => ({
  saveConnectionSettings: io.saveConnectionSettings,
}));
vi.mock("@schornio/aibox-database/xrag/listArtifacts", () => ({
  listArtifacts: io.listArtifacts,
}));
vi.mock("@schornio/aibox-database/aiModel/createExternalAIModel", () => ({
  createExternalAIModel: io.createExternalAIModel,
}));
vi.mock("@schornio/aibox-database/aiModel/updateExternalAIModel", () => ({
  updateExternalAIModel: io.updateExternalAIModel,
}));
vi.mock("@schornio/aibox-database/aiModel/updateAIModelMetadata", () => ({
  updateAIModelMetadata: io.updateAIModelMetadata,
}));
vi.mock("@schornio/aibox-database/aiModel/deleteAIModel", () => ({
  deleteAIModel: io.deleteAIModel,
}));
vi.mock("@schornio/aibox-database/workspace/updateWorkspaceAutoJoin", () => ({
  updateWorkspaceAutoJoin: io.updateWorkspaceAutoJoin,
}));
vi.mock("@schornio/aibox-database/workspace/updateWorkspaceSSOMapping", () => ({
  updateWorkspaceSSOMapping: io.updateWorkspaceSSOMapping,
}));
vi.mock("@schornio/aibox-database/user/toggleAdmin", () => ({
  toggleAdmin: io.toggleAdmin,
}));
vi.mock("@schornio/aibox-database/user/updateUserProfileName", () => ({
  updateUserProfileName: io.updateUserProfileName,
}));
vi.mock("@schornio/aibox-database/connections/listConnections", () => ({
  listConnections: io.listConnections,
}));
vi.mock("@schornio/aibox-database/connections/deleteConnection", () => ({
  deleteConnection: io.deleteConnection,
}));
vi.mock("@schornio/aibox-database/sso/createSSOSettings", () => ({
  createSSOSettings: io.createSSOSettings,
}));
vi.mock("@schornio/aibox-database/sso/saveSSOAttributeMapping", () => ({
  saveSSOAttributeMapping: io.saveSSOAttributeMapping,
}));
vi.mock("@schornio/aibox-database/config/saveThemeSettings", () => ({
  saveThemeSettings: io.saveThemeSettings,
}));
vi.mock("@schornio/aibox-database/config/getSystemConfig", () => ({
  getSystemConfig: io.getSystemConfig,
}));
vi.mock("@schornio/aibox-database/sso/getSSOProvider", () => ({
  getSSOProvider: io.getSSOProvider,
}));
vi.mock("@schornio/aibox-database/sso/deleteSSOProvider", () => ({
  deleteSSOProvider: io.deleteSSOProvider,
}));
vi.mock("@schornio/aibox-database/sso/getSAMLMetadata", () => ({
  getSAMLMetadata: io.getSAMLMetadata,
}));
vi.mock("@schornio/aibox-database/user/createUserWithResetKey", () => ({
  createUserWithResetKey: io.createUserWithResetKey,
}));
vi.mock("@schornio/aibox-database/user/reissuePasswordResetKey", () => ({
  reissuePasswordResetKey: io.reissuePasswordResetKey,
}));
vi.mock(
  "@schornio/aibox-database/aiModel/getExternalAIModelConnection",
  () => ({ getExternalAIModelConnection: io.getExternalAIModelConnection }),
);
vi.mock("@schornio/aibox-database/storage/uploadAsset", () => ({
  uploadAsset: io.uploadAsset,
}));
vi.mock("@schornio/aibox-database/user/redeemPasswordResetKey", () => ({
  redeemPasswordResetKey: io.redeemPasswordResetKey,
}));
vi.mock("@schornio/aibox-database/user/getUserById", () => ({
  getUserById: io.getUserById,
}));
vi.mock("@schornio/aibox-database/user/saveUserAvatar", () => ({
  saveUserAvatar: io.saveUserAvatar,
}));
vi.mock("@schornio/aibox-database/config/getCurrentUserConfig", () => ({
  getCurrentUserConfig: io.getCurrentUserConfig,
}));
vi.mock("@schornio/aibox-database/config/setUserConfig", () => ({
  setUserConfig: io.setUserConfig,
}));
vi.mock("@schornio/aibox-database/mcp/listMCPOAuthConnections", () => ({
  listMCPOAuthConnections: io.listMCPOAuthConnections,
}));
vi.mock("@schornio/aibox-database/mcp/deleteMCPOAuthConnection", () => ({
  deleteMCPOAuthConnection: io.deleteMCPOAuthConnection,
}));
vi.mock("@schornio/aibox-database/storage/createAssetUpload", () => ({
  createAssetUpload: io.createAssetUpload,
}));
vi.mock("@schornio/aibox-database/user/getUserIsAdmin", () => ({
  getUserIsAdmin: io.getUserIsAdmin,
}));
vi.mock(
  "@schornio/aibox-database/workspace/getWorkspacesWithUserClaim",
  () => ({ getWorkspacesWithUserClaim: io.getWorkspacesWithUserClaim }),
);
vi.mock("@schornio/aibox-database/user/getUsersWithWorkspaceClaim", () => ({
  getUsersWithWorkspaceClaim: io.getUsersWithWorkspaceClaim,
}));
vi.mock("../packages/realtime/src/models/listExternalModels.ts", () => ({
  listExternalModels: io.discover,
}));
vi.mock(
  "../packages/realtime/src/documents/artifactCatalog/ArtifactCatalogSession.ts",
  () => ({
    ArtifactCatalogSession: class {
      publish = io.publish;
      remove = io.removeArtifact;
      async [Symbol.asyncDispose]() {}
    },
  }),
);
const userId = "11111111-1111-4111-8111-111111111111";
const workspaceId = "demo-workspace";
const supabase = { client: "user" } as any,
  service = { client: "service" } as any;
const transcriber = {
  id: "transcriber",
  workspaceId,
  name: "Transcriber",
  identifier: "transcriber",
  version: "transcriber-v2",
};
function context(overrides: Partial<PlatformContext> = {}): PlatformContext {
  return {
    userId,
    level: "admin",
    claims: "admin",
    supabase,
    supabaseServiceRole: service,
    serverToken: "Worker test",
    websocketProvider: {} as any,
    getSsoConfig: () => ({
      supabaseUrl: "https://supabase.test",
      supabaseServiceRoleKey: "secret",
    }),
    ...overrides,
  };
}
function execute(name: string, input: unknown = {}, c = context()) {
  return createPlatformTools(c)
    .find((t) => t.name === name)!
    .execute(input);
}
beforeEach(() => {
  Object.values(io).forEach((f) => f.mockReset());
  io.getAgentById.mockResolvedValue(agent);
  io.getDocumentRepositoryById.mockResolvedValue(repository);
  io.getTranscriberById.mockResolvedValue(transcriber);
  io.getUserById.mockResolvedValue({
    email: "alice@example.test",
    signInMethod: "email",
  });
});

describe("platform management operations", () => {
  it.each([
    ["platform_workspaces_list", "getWorkspaces", [], { supabase }],
    ["platform_agents_list", "getAgents", [], { supabase }],
    [
      "platform_agent_get",
      "getAgentById",
      [agent.id],
      { supabase },
      { id: agent.id },
    ],
    ["platform_repositories_list", "getDocumentRepositories", [], { supabase }],
    ["platform_transcribers_list", "getTranscribers", [], { supabase }],
    ["platform_models_list", "getAIModels", [], { supabase }],
    ["platform_users_list", "getUsers", [], { supabaseServiceRole: service }],
    ["platform_connections_list", "listConnections", [], { supabase: service }],
    [
      "platform_artifacts_list",
      "listArtifacts",
      [3],
      { supabase: service },
      { offset: 3 },
    ],
    [
      "platform_profile_get",
      "getUserById",
      [userId],
      { supabaseServiceRole: service },
    ],
    [
      "platform_favorites_get",
      "getCurrentUserConfig",
      ["favorites"],
      { supabase },
    ],
    [
      "platform_view_preferences_get",
      "getCurrentUserConfig",
      ["groupSortView-agents"],
      { supabase },
      { id: "agents" },
    ],
    [
      "platform_personal_mcp_connections",
      "listMCPOAuthConnections",
      [userId],
      { supabase: service },
    ],
  ] as const)(
    "%s uses the authorized database client and returns its result",
    async (name, operation, args, options, input) => {
      (io[operation] as any).mockResolvedValue({ result: "expected" });
      expect(await execute(name, input ?? {})).toEqual({ result: "expected" });
      expect(io[operation]).toHaveBeenCalledExactlyOnceWith(...args, options);
    },
  );
  it.each([
    ["agent", agent, "updateAgent", "deleteAgent"],
    [
      "repository",
      repository,
      "updateDocumentRepository",
      "deleteDocumentRepository",
    ],
    ["transcriber", transcriber, "updateTranscriber", "deleteTranscriber"],
  ] as const)(
    "authorizes the source and destination of a %s before updating or deleting",
    async (kind, value, update, remove) => {
      const restricted = context({
        claims: [{ organization_id: workspaceId, role: "workspace-admin" }],
      });
      await expect(
        execute(
          `platform_${kind}_update`,
          { [kind]: { ...value, workspaceId: "forbidden" } },
          restricted,
        ),
      ).rejects.toThrow("NOT_AUTHORIZED");
      expect(io[update]).not.toHaveBeenCalled();
      expect(
        await execute(`platform_${kind}_update`, { [kind]: value }, restricted),
      ).toEqual({ id: value.id });
      expect(io[update]).toHaveBeenCalledWith(
        value,
        kind === "agent"
          ? { supabaseServiceRole: service, expectedWorkspaceId: workspaceId }
          : { supabase },
      );
      expect(
        await execute(`platform_${kind}_delete`, { id: value.id }, restricted),
      ).toEqual({ id: value.id });
      expect(io[remove]).toHaveBeenCalledWith(value.id, { supabase });
    },
  );
  it("creates resources only in administered workspaces", async () => {
    const c = context({
      claims: [{ organization_id: workspaceId, role: "workspace-admin" }],
    });
    io.createDocumentRepository.mockResolvedValue({ id: repository.id });
    expect(
      await execute("platform_repository_create", { repository }, c),
    ).toEqual({ id: repository.id });
    expect(io.createDocumentRepository).toHaveBeenCalledWith(repository, {
      supabase,
    });
    expect(
      await execute("platform_transcriber_create", { transcriber }, c),
    ).toEqual({ id: transcriber.id });
    expect(io.createTranscriber).toHaveBeenCalledWith(transcriber, {
      supabase,
    });
    await expect(
      execute(
        "platform_repository_create",
        { repository: { ...repository, workspaceId: "other" } },
        c,
      ),
    ).rejects.toThrow("NOT_AUTHORIZED");
  });
  it("updates workspace descriptions/documentation and administrator membership settings", async () => {
    const options = { supabaseServiceRole: service };
    await execute("platform_workspace_update", {
      workspaceId,
      name: "Team",
      description: "Info",
    });
    expect(io.updateWorkspaceDescription).toHaveBeenCalledWith(
      workspaceId,
      { name: "Team", description: "Info" },
      options,
    );
    await execute("platform_workspace_documentation_update", {
      workspaceId,
      documentation: "Docs",
    });
    expect(io.updateWorkspaceDocumentation).toHaveBeenCalledWith(
      workspaceId,
      { documentation: "Docs" },
      options,
    );
    io.createWorkspace.mockResolvedValue("new");
    expect(
      await execute("platform_workspace_create", {
        name: "Team",
        description: "Info",
      }),
    ).toBe("new");
    await execute("platform_user_permission_update", {
      workspaceId,
      userId,
      role: "editor",
    });
    expect(io.updateUserPermission).toHaveBeenCalledWith(
      { workspaceId, userId, role: "editor" },
      options,
    );
    await execute("platform_workspace_autojoin_update", {
      workspaceId,
      autoJoin: true,
    });
    expect(io.updateWorkspaceAutoJoin).toHaveBeenCalledWith(
      workspaceId,
      { autoJoin: true },
      options,
    );
    await execute("platform_workspace_sso_mapping_update", {
      workspaceId,
      samlMappingEditor: "editors",
    });
    expect(io.updateWorkspaceSSOMapping).toHaveBeenCalledWith(
      workspaceId,
      { samlMappingEditor: "editors" },
      options,
    );
    await execute("platform_user_admin_update", {
      userId,
      operation: "demoteFromAdmin",
    });
    expect(io.toggleAdmin).toHaveBeenCalledWith(
      "demoteFromAdmin",
      userId,
      options,
    );
    await execute("platform_user_name_update", {
      userId,
      firstName: "Ada",
      lastName: "Lovelace",
    });
    expect(io.updateUserProfileName).toHaveBeenCalledWith(
      userId,
      { firstName: "Ada", lastName: "Lovelace" },
      options,
    );
  });
  it("validates external model credentials and preserves empty update credentials for the database operation", async () => {
    const input = {
      provider: "openai",
      baseUrl: "https://api.example.test/v1",
      modelId: "model",
      name: "Model",
      description: "",
      type: "llm",
      apiKey: "",
    };
    await expect(execute("platform_model_create", input)).rejects.toThrow(
      "MODEL_API_KEY_REQUIRED",
    );
    expect(io.createExternalAIModel).not.toHaveBeenCalled();
    io.createExternalAIModel.mockResolvedValue("new-model");
    expect(
      await execute("platform_model_create", { ...input, apiKey: "secret" }),
    ).toEqual({ id: "new-model" });
    await execute("platform_model_create", {
      ...input,
      provider: "openai-compatible",
    });
    expect(
      await execute("platform_model_connection_update", {
        ...input,
        id: "id",
        apiKey: "",
      }),
    ).toEqual({ id: "id" });
    expect(io.updateExternalAIModel).toHaveBeenCalledWith(
      expect.objectContaining({ id: "id", apiKey: "" }),
      { supabase: service },
    );
    io.updateAIModelMetadata.mockResolvedValue("id");
    expect(
      await execute("platform_model_metadata_update", {
        id: "id",
        name: "New",
        description: "Details",
      }),
    ).toEqual({ id: "id" });
    await execute("platform_model_delete", { id: "id" });
    expect(io.deleteAIModel).toHaveBeenCalledWith("id", { supabase: service });
  });
  it("manages connection metadata and artifact lifecycle through shared operations", async () => {
    const id = userId;
    await execute("platform_connection_delete", { id });
    expect(io.deleteConnection).toHaveBeenCalledWith(id, { supabase: service });
    const connection = { kind: "brave", name: "Search", secret: "secret" };
    io.saveConnectionSettings.mockResolvedValue({ id });
    expect(await execute("platform_connection_save", connection)).toEqual({
      id,
    });
    const oauth = {
      kind: "oauth",
      name: "OAuth",
      clientId: "client",
      secret: "secret",
      issuer: "https://auth.test",
    };
    await execute("platform_connection_save", oauth);
    expect(io.saveConnectionSettings).toHaveBeenCalledWith(oauth, {
      supabase: service,
    });
    await expect(
      execute("platform_connection_save", { ...oauth, issuer: undefined }),
    ).rejects.toThrow();
    io.publish.mockResolvedValue("artifact");
    expect(
      await execute("platform_artifact_publish", {
        actionFileName: "package.xrag",
      }),
    ).toEqual({ id: "artifact" });
    expect(io.publish).toHaveBeenCalledWith("package.xrag", {
      supabase: service,
    });
    await expect(
      execute("platform_artifact_publish", { actionFileName: ".." }),
    ).rejects.toThrow();
    await execute("platform_artifact_delete", { id: "artifact" });
    expect(io.removeArtifact).toHaveBeenCalledWith("artifact", {
      supabase: service,
    });
  });
  it("uses server-held SSO configuration and refuses missing configuration", async () => {
    const options = { supabaseServiceRoleConfig: context().getSsoConfig!() };
    io.getSSOProvider.mockResolvedValue({ id: "saml" });
    io.getSAMLMetadata.mockResolvedValue("<xml/>");
    expect(await execute("platform_sso_get")).toEqual({ id: "saml" });
    expect(await execute("platform_sso_metadata")).toBe("<xml/>");
    await execute("platform_sso_delete");
    expect(io.deleteSSOProvider).toHaveBeenCalledWith(options);
    await execute("platform_sso_mapping_update", {});
    expect(io.saveSSOAttributeMapping).toHaveBeenCalledWith({}, options);
    await expect(
      execute("platform_sso_get", {}, context({ getSsoConfig: undefined })),
    ).rejects.toThrow("SSO_NOT_CONFIGURED");
  });
  it("reads theme settings and resolves model discovery credentials without returning them", async () => {
    io.getSystemConfig.mockImplementation(async (key) => ({ key }));
    expect(await execute("platform_theme_get")).toEqual({
      theme: { key: "theme" },
      welcomeMessage: { key: "welcomeMessage" },
      accessMessage: { key: "accessMessage" },
    });
    io.getExternalAIModelConnection.mockResolvedValue({
      config: {
        provider: "openai",
        baseUrl: "https://saved.example",
        modelId: "saved",
      },
      apiKey: "stored",
    });
    io.discover.mockResolvedValue([{ id: "model" }]);
    expect(
      await execute("platform_models_discover", { connection: { id: "id" } }),
    ).toEqual([{ id: "model" }]);
    expect(io.discover).toHaveBeenCalledWith({
      provider: "openai",
      baseUrl: "https://saved.example",
      modelId: "saved",
      apiKey: "stored",
    });
    await execute("platform_models_discover", {
      connection: {
        provider: "openai-compatible",
        baseUrl: "https://api.example",
        modelId: "model",
        name: "Model",
        type: "llm",
        apiKey: "",
      },
    });
    await execute("platform_user_reset_key", { userId });
    expect(io.reissuePasswordResetKey).toHaveBeenCalledWith(userId, {
      supabaseServiceRole: service,
    });
  });
  it("keeps profile settings and OAuth disconnections bound to the caller", async () => {
    const c = context({
      level: "user",
      claims: [{ organization_id: workspaceId, role: "user" }],
    });
    await execute("platform_profile_avatar_update", { avatarPath: null }, c);
    expect(io.saveUserAvatar).toHaveBeenLastCalledWith(userId, undefined, {
      supabaseServiceRole: service,
    });
    await execute(
      "platform_profile_avatar_update",
      { avatarPath: `user_avatars/${userId}/pic.png` },
      c,
    );
    expect(io.saveUserAvatar).toHaveBeenLastCalledWith(
      userId,
      `user_avatars/${userId}/pic.png`,
      { supabaseServiceRole: service },
    );
    await execute(
      "platform_favorites_update",
      { favorites: [], showInSidebar: true, version: "favorites-v2" },
      c,
    );
    expect(io.setUserConfig).toHaveBeenCalledWith(
      userId,
      "favorites",
      expect.anything(),
      { supabase },
    );
    await execute(
      "platform_view_preferences_update",
      { id: "agents", preferences: undefined },
      c,
    );
    expect(io.setUserConfig).toHaveBeenCalledWith(
      userId,
      "groupSortView-agents",
      {},
      { supabase },
    );
    await execute(
      "platform_view_preferences_update",
      { id: "agents", preferences: { view: "table" } },
      c,
    );
    await execute(
      "platform_personal_mcp_disconnect",
      { serverUrl: "https://mcp.test" },
      c,
    );
    expect(io.deleteMCPOAuthConnection).toHaveBeenCalledWith(
      userId,
      "https://mcp.test",
      { supabase: service },
    );
  });
  it.each([null, `user_avatars/${userId}/avatar.png`])(
    "allows an admin avatar update with %s",
    async (avatarPath) => {
      await execute("platform_user_avatar_update", { userId, avatarPath });
      expect(io.saveUserAvatar).toHaveBeenCalledWith(
        userId,
        avatarPath ?? undefined,
        { supabaseServiceRole: service },
      );
    },
  );
  it.each(["wrong/path", `user_avatars/${userId}/../avatar.png`])(
    "rejects invalid avatar target %s",
    async (avatarPath) => {
      await expect(
        execute("platform_user_avatar_update", { userId, avatarPath }),
      ).rejects.toThrow("INVALID_AVATAR_PATH");
      expect(io.saveUserAvatar).not.toHaveBeenCalled();
    },
  );
  it.each(["avatar", "theme", "xrag"])(
    "uploads %s assets to the correct bucket without leaking bytes",
    async (kind) => {
      const bucket =
        kind === "avatar"
          ? "user_avatars"
          : kind === "theme"
            ? "theme_logos"
            : "box-action-files";
      await execute("platform_asset_upload_url", {
        kind,
        fileName: "file.png",
        userId,
      });
      expect(io.createAssetUpload).toHaveBeenCalledWith(
        bucket,
        userId,
        "file.png",
        { supabase: service },
      );
      await execute("platform_asset_upload", {
        kind,
        fileName: "file.png",
        base64: "eA==",
        mimeType: "image/png",
      });
      expect(io.uploadAsset).toHaveBeenCalledWith(
        bucket,
        userId,
        "file.png",
        Buffer.from("x"),
        "image/png",
        { supabase: service },
      );
    },
  );
  it("requires an email account and valid reset key, including administrator resets", async () => {
    await execute("platform_profile_password_reset", {
      password: "new-password",
      passwordResetKey: "key",
    });
    expect(io.redeemPasswordResetKey).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "alice@example.test",
        passwordResetKey: "key",
      }),
      { supabaseServiceRole: service },
    );
    await execute("platform_profile_password_reset", {
      userId: "22222222-2222-4222-8222-222222222222",
      password: "new-password",
      passwordResetKey: "key",
    });
    for (const profile of [
      { signInMethod: "email" },
      { email: "sso@test", signInMethod: "sso" },
    ]) {
      io.getUserById.mockResolvedValue(profile);
      await expect(
        execute("platform_profile_password_reset", {
          password: "new-password",
          passwordResetKey: "key",
        }),
      ).rejects.toThrow("EMAIL_ACCOUNT_REQUIRED");
    }
  });
});
