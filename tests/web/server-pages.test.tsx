vi.mock("@schornio/aibox-package-database/chat/getChatExpiration", () => ({
  getChatExpiration: async () => ({ seconds: null, expiresAt: null }),
}));
vi.mock("../../apps/web/app/_models/getAgentConnections", () => ({
  getAgentConnections: async () => [],
}));
vi.mock("../../apps/web/app/_models/systemConfigAccessMessage", () => ({
  getSystemConfigAccessMessage: vi.fn(async () => ({})),
}));
import "./client-setup";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAgentById as getAgentContent } from "@schornio/aibox-package-database/agent/getAgentById";
import { notFound } from "next/navigation";
import { isValidElement } from "react";
import { RealtimeProvider } from "../../apps/web/lib/RealtimeProvider";
const state = vi.hoisted(() => ({
  models: [] as any[],
  repositories: [] as any[],
  agents: [] as any[],
  transcribers: [] as any[],
  profile: undefined as any,
  sso: undefined as any,
  signIn: { password: "visible", sso: "visible" } as any,
  welcome: {} as any,
  entity: undefined as any,
  theme: { colors: [] } as any,
  favorites: { favorites: [] } as any,
  workspaces: [
    { id: "workspace", name: "Workspace", claim: "workspace-admin" },
  ] as any[],
  supabase: { storage: { from: () => ({}) } },
  inspected: undefined as any,
  inspect: vi.fn(),
  isGlobalAdmin: true,
}));
vi.mock("@/lib/ensureActivity", () => ({ ensureActivity: vi.fn() }));
vi.mock("@schornio/aibox-package-database/user/getCurrentUser", () => ({
  getCurrentUser: async () => ({ id: "user" }),
}));
vi.mock("@/lib/supabase/getWorkspaceAdminContext", () => ({
  getWorkspaceAdminContext: async () => ({
    supabaseServiceRole: state.supabase,
    isGlobalAdmin: state.isGlobalAdmin,
  }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => state.supabase,
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: () => ({}),
}));
vi.mock("@schornio/aibox-package-database/agent/getAgentWorkspaceId", () => ({
  getAgentWorkspaceId: vi.fn(async () => state.entity?.workspaceId),
}));
vi.mock("@/lib/groupSortView/model", () => ({
  getGroupSortViewPreferences: async (id: string) => ({ id, view: "table" }),
}));
vi.mock("@/lib/groupSortView/action", () => ({ savePreferences: vi.fn() }));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: () => ({ action: () => vi.fn() }),
    action: () => vi.fn(),
  },
}));
vi.mock("../../apps/web/app/_models/getAIModels", () => ({
  getAIModels: async () => state.models,
}));
vi.mock("../../apps/web/app/_models/getDocumentRepositories", () => ({
  getDocumentRepositories: async () => state.repositories,
}));
vi.mock("../../apps/web/app/_models/getWorkspaceClaims", () => ({
  getWorkspaceClaims: async () => ({
    claims: state.workspaces,
    isAdmin: state.profile?.isAdmin ?? false,
  }),
}));
vi.mock(
  "../../apps/web/app/_models/currentUserConfigFavorites",
  async (importOriginal) => ({
    ...(await importOriginal<any>()),
    getCurrentUserConfigFavorites: async () => state.favorites,
  }),
);
vi.mock(
  "../../apps/web/app/_models/systemConfigTheme",
  async (importOriginal) => ({
    ...(await importOriginal<any>()),
    getSystemConfigTheme: async () => state.theme,
  }),
);
vi.mock("@schornio/aibox-package-database/agent/getAgentById", () => ({
  getAgentById: vi.fn(async () => state.entity),
}));
vi.mock("@schornio/aibox-package-database/agent/getAgents", () => ({
  getAgents: vi.fn(async () => state.agents),
}));
vi.mock("@schornio/aibox-package-database/transcriber/getTranscribers", () => ({
  getTranscribers: vi.fn(async () => state.transcribers),
}));
vi.mock(
  "@schornio/aibox-package-database/transcriber/getTranscriberById",
  () => ({ getTranscriberById: vi.fn(async () => state.entity) }),
);
vi.mock(
  "@schornio/aibox-package-database/documentRepositories/getDocumentRepositoryById",
  () => ({ getDocumentRepositoryById: vi.fn(async () => state.entity) }),
);
import newAgent from "../../apps/web/app/(main)/agent/new/page";
import editAgent from "../../apps/web/app/(main)/agent/[agentId]/edit/page";
import infoAgent from "../../apps/web/app/(main)/agent/[agentId]/page";
import listAgent from "../../apps/web/app/(main)/agent/page";
import newRepository from "../../apps/web/app/(main)/app/documents/new/page";
import editRepository from "../../apps/web/app/(main)/app/documents/[documentRepositoryId]/edit/page";
import infoRepository from "../../apps/web/app/(main)/app/documents/[documentRepositoryId]/info/page";
import listRepository from "../../apps/web/app/(main)/app/documents/page";
import newTranscriber from "../../apps/web/app/(main)/app/transcribe/new/page";
import editTranscriber from "../../apps/web/app/(main)/app/transcribe/[transcriberId]/edit/page";
import infoTranscriber from "../../apps/web/app/(main)/app/transcribe/[transcriberId]/page";
import listTranscriber from "../../apps/web/app/(main)/app/transcribe/page";

function elements(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement(node)) return [];
  return [node, ...elements((node.props as any).children)];
}
function component(node: any, name: string) {
  return elements(node).find((element) => element.type?.name === name);
}
function params() {
  return {
    params: Promise.resolve({
      agentId: "route-id",
      documentRepositoryId: "route-id",
      transcriberId: "route-id",
    }),
  } as any;
}
beforeEach(() => {
  state.isGlobalAdmin = true;
  vi.mocked(notFound).mockImplementation(() => {
    throw new Error("NOT_FOUND");
  });
  state.workspaces = [
    { id: "workspace", name: "Workspace", claim: "workspace-admin" },
  ];
  state.models = [
    { id: "model", identifier: "model", name: "Model", type: "mlx_whisper_v1" },
  ];
  state.repositories = [{ id: "repo", identifier: "repo" }];
  state.agents = [{ id: "agent" }];
  state.transcribers = [{ id: "transcriber", identifier: "transcriber" }];
  state.entity = {
    id: "entity",
    workspaceId: "workspace",
    name: "Entity",
    index: { keyword: { active: true } },
  };
  state.favorites = {
    favorites: [{ id: "agent" }, { id: "repo" }, { id: "transcriber" }],
  };
  state.theme = {
    colors: [{ color: { type: "color-oklch-hue", oklchHue: 42 } }],
  };
});
describe("server catalog pages", () => {
  it.each([
    [listAgent, "AgentListProvider", "agentsWithFavorite", "AgentList"],
    [
      listRepository,
      "DocumentRepositoryListProvider",
      "documentRepositoriesWithFavorite",
      "DocumentRepositoryList",
    ],
    [
      listTranscriber,
      "TranscriberListProvider",
      "transcriberWithFavorite",
      "TranscriberList",
    ],
  ] as const)(
    "joins favorites before passing lists to %s",
    async (page, provider, property, list) => {
      const result = await page();
      expect(component(result, provider).props[property][0].favorite).toBe(
        true,
      );
      expect(component(result, provider).props.userPreferences.view).toBe(
        "table",
      );
      expect(component(result, list)).toBeTruthy();
      state.agents = [];
      state.repositories = [];
      state.transcribers = [];
      const empty = await page();
      expect(component(empty, list)).toBeUndefined();
      expect(component(empty, provider).props[property]).toEqual([]);
    },
  );
  it.each([
    [newAgent, "AgentEditor", "agent"],
    [newRepository, "DocumentRepositoryEditor", "documentRepository"],
    [newTranscriber, "TranscriberEditor", "transcriber"],
  ] as const)(
    "creates a unique editable draft in %s",
    async (page, editor, property) => {
      const result = await page();
      const props = component(result, editor).props;
      expect(props.mode).toBe("create");
      expect(props[property]).toMatchObject({
        name: "",
        color: { oklchHue: 42 },
      });
      expect(props[property].id).toMatch(/^[0-9a-f-]{36}$/);
      expect(props.relations.models).toBe(state.models);
      if (editor === "AgentEditor")
        expect(props.relations.transcribers).toBe(state.transcribers);
      const second = component(await page(), editor).props[property];
      expect(second.id).not.toBe(props[property].id);
      state.theme = { colors: [] };
      expect(
        component(await page(), editor).props[property].color.oklchHue,
      ).toBe(0);
      state.theme = {};
      expect(
        component(await page(), editor).props[property].color,
      ).toBeDefined();
    },
  );
  it("selects a transcriber model only when the choice is unambiguous", async () => {
    expect((await newTranscriber()).props.transcriber.modelIdentifier).toBe(
      "model",
    );
    state.models.push({ identifier: "other", type: "mlx_whisper_v1" });
    expect(
      (await newTranscriber()).props.transcriber.modelIdentifier,
    ).toBeUndefined();
    state.models = [];
    expect(
      (await newTranscriber()).props.transcriber.modelIdentifier,
    ).toBeUndefined();
  });
  it.each([
    [editAgent, "AgentEditor", "agent"],
    [editRepository, "DocumentRepositoryEditor", "documentRepository"],
    [editTranscriber, "TranscriberEditor", "transcriber"],
  ] as const)(
    "loads existing entities for %s and rejects missing records",
    async (page, editor, property) => {
      const props = component(await page(params()), editor).props;
      expect(props[property]).toBe(state.entity);
      expect(props.mode).toBe("update");
      expect(props.favorites).toBe(state.favorites);
      expect(props.relations.workspaces).toBe(state.workspaces);
      if (editor === "AgentEditor")
        expect(props.relations.transcribers).toBe(state.transcribers);
      state.entity = undefined;
      await expect(page(params())).rejects.toThrow("NOT_FOUND");
    },
  );
  it.each([
    [infoAgent, "AgentInfo", "agent"],
    [infoRepository, "DocumentRepositoryInfo", "documentRepository"],
    [infoTranscriber, "TranscriberInfo", "transcriber"],
  ] as const)(
    "provides details, relations and workspace in %s",
    async (page, info, property) => {
      const props = component(await page(params()), info).props;
      expect(props[property]).toBe(state.entity);
      expect(props.modelMap.get("model")).toBe(state.models[0]);
      expect(props.workspace).toBe(state.workspaces[0]);
      expect(props.editable).toBe(true);
      state.entity = undefined;
      await expect(page(params())).rejects.toThrow("NOT_FOUND");
    },
  );
  it.each([
    {},
    { keyword: { active: true } },
    { embedding: { active: true } },
    { keyword: { active: false }, embedding: { active: false } },
  ])(
    "enables repository search according to the configured indexes %j",
    async (index) => {
      state.entity.index = index;
      const props = component(
        await infoRepository(params()),
        "TabsDocumentRepository",
      ).props;
      expect(Boolean(props.hasFulltextSearch)).toBe(
        Boolean(
          (index as any).keyword?.active || (index as any).embedding?.active,
        ),
      );
    },
  );
});

vi.mock("@schornio/aibox-package-database/storage/inspect", () => ({
  inspect: state.inspect,
}));
import repoFiles from "../../apps/web/app/(main)/app/documents/[documentRepositoryId]/files/[[...path]]/page";
import chatFiles from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/files/[[...path]]/page";
import transcriptionFiles from "../../apps/web/app/(main)/app/transcribe/[transcriberId]/[activityId]/files/[[...path]]/page";
import chatInfo from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/info/page";
import transcriptionInfo from "../../apps/web/app/(main)/app/transcribe/[transcriberId]/[activityId]/info/page";
import repoSearch from "../../apps/web/app/(main)/app/documents/[documentRepositoryId]/search/page";

describe("server activity and file pages", () => {
  it.each([repoFiles, chatFiles, transcriptionFiles])(
    "decodes file paths and dispatches folders and files in %s",
    async (page) => {
      state.inspect.mockResolvedValue({
        file: true,
        path: "My File.txt",
        name: "My File.txt",
      });
      const request = {
        params: Promise.resolve({
          agentId: "agent",
          activityId: "activity",
          transcriberId: "transcriber",
          documentRepositoryId: "repo",
          path: ["My%20File.txt"],
        }),
      } as any;
      const file = component(await page(request), "File");
      expect(file.props.file.path).toBe("My File.txt");
      expect(state.inspect.mock.lastCall![0]).toBe("My File.txt");
      state.inspect.mockResolvedValue({ folder: true, path: "folder" });
      expect(component(await page(request), "Folder").props.path).toBe(
        "My File.txt",
      );
      await page({
        params: Promise.resolve({
          agentId: "agent",
          activityId: "activity",
          transcriberId: "transcriber",
          documentRepositoryId: "repo",
        }),
      } as any);
      expect(state.inspect.mock.lastCall![0]).toBe("/");
      state.inspect.mockResolvedValue(undefined);
      await expect(page(request)).rejects.toThrow("NOT_FOUND");
    },
  );
  it.each([
    [chatInfo, "AgentInfo"],
    [transcriptionInfo, "TranscriberInfo"],
  ] as const)(
    "loads activity info with model relationships in %s",
    async (page, info) => {
      const request = {
        params: Promise.resolve({
          agentId: "agent",
          activityId: "activity",
          transcriberId: "transcriber",
        }),
      } as any;
      const props = component(await page(request), info).props;
      expect(props.modelMap.get("model")).toBe(state.models[0]);
      expect(props.workspace.id).toBe("workspace");
      state.entity = undefined;
      await expect(page(request)).rejects.toThrow("NOT_FOUND");
    },
  );
  it.each([undefined, "", "needle", ["one", "two"]])(
    "normalizes repository search query %j",
    async (query) => {
      const request = { ...params(), searchParams: Promise.resolve({ query }) };
      const result = await repoSearch(request);
      const search = component(result, "Search");
      if (query)
        expect(search.props.query).toBe(
          Array.isArray(query) ? "one two" : query,
        );
      else expect(search).toBeUndefined();
      state.entity = undefined;
      await expect(repoSearch(request)).rejects.toThrow("NOT_FOUND");
    },
  );
});

vi.mock("../../apps/web/app/_models/getCurrentUserProfile", () => ({
  getCurrentUserProfile: async () => state.profile,
}));
vi.mock(
  "../../apps/web/app/_models/systemConfigSignIn",
  async (importOriginal) => ({
    ...(await importOriginal<any>()),
    getSystemConfigSignIn: async () => state.signIn,
  }),
);
vi.mock(
  "../../apps/web/app/_models/systemConfigWelcomeMessage",
  async (importOriginal) => ({
    ...(await importOriginal<any>()),
    getSystemConfigWelcomeMessage: async () => state.welcome,
  }),
);
vi.mock("@/lib/supabase/saveGetSupabaseServiceRoleConfig", () => ({
  saveGetSupabaseServiceRoleConfig: async () => ({}),
}));
vi.mock("@/lib/supabase/saveCreateSupabaseServiceRoleClient", () => ({
  saveCreateSupabaseServiceRoleClient: async () => state.supabase,
}));
vi.mock("@schornio/aibox-package-database/sso/getSSOProvider", () => ({
  getSSOProvider: async () => state.sso,
}));
vi.mock("@schornio/aibox-package-database/user/getUserById", () => ({
  getUserById: async () => state.profile,
}));
vi.mock("@schornio/aibox-package-database/workspace/getWorkspaceById", () => ({
  getWorkspaceById: async () => state.entity,
}));
import signInPage from "../../apps/web/app/signin/page";
import { LogoData } from "../../apps/web/app/_components/Logo";
import mePage from "../../apps/web/app/(settings)/me/(main)/page";
import userPage from "../../apps/web/app/(settings)/settings/user/[userId]/page";
import workspacePage from "../../apps/web/app/(settings)/settings/workspace/[workspaceId]/page";
import ssoPage from "../../apps/web/app/(settings)/settings/sso/page";
import DashboardFavorites from "../../apps/web/app/(main)/_components/DashboardFavorites";
import { getT } from "next-i18next/server";
describe("server settings and sign-in pages", () => {
  beforeEach(() => {
    state.profile = {
      id: "user",
      firstName: "Ada",
      lastName: "Lovelace",
      signInMethod: "email",
    };
    state.sso = { id: "sso", saml: { entity_id: "https://idp.test/entity" } };
    state.signIn = { password: "visible", sso: "visible" };
    state.welcome = {};
    vi.mocked(getT).mockImplementation(
      async () =>
        ({
          lng: "en",
          t: (key: string) => key,
          i18n: { languages: ["en"] },
        }) as any,
    );
  });
  it.each(["email", "sso"])(
    "renders editing and permission controls for a %s user",
    async (signInMethod) => {
      state.profile.signInMethod = signInMethod;
      const result = await userPage({
        params: Promise.resolve({ userId: "user" }),
      } as any);
      expect(component(result, "EditorName").props.targetUserId).toBe("user");
      expect(component(result, "UserResetKey").props.isLocal).toBe(
        signInMethod === "email",
      );
      expect(Boolean(component(result, "UserEditorPermissions"))).toBe(
        signInMethod === "email",
      );
    },
  );
  it("loads personal profile editors and rejects an absent current user", async () => {
    expect(component(await mePage(), "EditorName").props.defaultFirstName).toBe(
      "Ada",
    );
    state.profile = undefined;
    await expect(mePage()).rejects.toThrow("NOT_FOUND");
  });
  it("shows not found for an absent workspace", async () => {
    state.entity = undefined;
    await expect(
      workspacePage({
        params: Promise.resolve({ workspaceId: "missing" }),
      } as any),
    ).rejects.toThrow("NOT_FOUND");
  });
  it("passes all workspace role mappings and description defaults to editors", async () => {
    state.entity = {
      id: "workspace",
      name: "Workspace",
      description: "Description",
      samlMappingUser: "users",
      samlMappingEditor: "editors",
      samlMappingWorkspaceAdmin: "admins",
    };
    const result = await workspacePage({
      params: Promise.resolve({ workspaceId: "workspace" }),
    } as any);
    expect(
      component(result, "WorkspaceEditorDescription").props.defaultDescription,
    ).toBe("Description");
    expect(component(result, "WorkspaceEditorSSOMappings").props).toMatchObject(
      {
        defaultSamlMappingUser: "users",
        defaultSamlMappingEditor: "editors",
        defaultSamlMappingWorkspaceAdmin: "admins",
      },
    );
  });
  it.each([false, true])(
    "only renders membership tabs and forms for global admins (%s)",
    async (isGlobalAdmin) => {
      state.isGlobalAdmin = isGlobalAdmin;
      const result = await workspacePage({
        params: Promise.resolve({ workspaceId: "workspace" }),
      } as any);
      for (const name of [
        "WorkspaceEditorPermissions",
        "WorkspaceEditorAutoJoin",
        "WorkspaceEditorSSOMappings",
      ])
        expect(Boolean(component(result, name))).toBe(isGlobalAdmin);
      expect(component(result, "WorkspaceEditorDescription")).toBeDefined();
      expect(component(result, "WorkspaceEditorDocs")).toBeDefined();
      for (const name of ["TabsMainTrigger", "TabsMainContent"]) {
        const views = elements(result)
          .filter((element) => element.type?.name === name)
          .map((element) => element.props.view);
        expect(views).toEqual(
          isGlobalAdmin
            ? ["default", "docs", "permissions", "sso-mappings"]
            : ["default", "docs"],
        );
      }
    },
  );
  it("offers SSO configuration or creation depending on provider presence", async () => {
    expect(
      component(await ssoPage(), "EditSAMLAttributeMapping").props.ssoProvider,
    ).toBe(state.sso);
    expect(component(await ssoPage(), "SAMLMetadataDownload")).toBeTruthy();
    state.sso = undefined;
    expect(component(await ssoPage(), "AddSSOProvider")).toBeTruthy();
    expect(component(await ssoPage(), "SAMLMetadataDownload")).toBeTruthy();
  });
  it("shows the signed-in account instead of credential inputs", async () => {
    const result = await signInPage({
      searchParams: Promise.resolve({}),
    } as any);
    expect(component(result, "AlreadySignedIn").props.user).toBe(state.profile);
    expect(component(result, "PasswordSignIn")).toBeUndefined();
  });
  it.each([{}, { method: "password" }, { method: "sso" }])(
    "honors sign-in visibility and explicit method %j",
    async (searchParams) => {
      state.profile = undefined;
      state.signIn = { password: "hidden", sso: "hidden" };
      let result = await signInPage({
        searchParams: Promise.resolve(searchParams),
      } as any);
      expect(Boolean(component(result, "PasswordSignIn"))).toBe(
        (searchParams as any).method === "password",
      );
      expect(Boolean(component(result, "SSOSignIn"))).toBe(
        (searchParams as any).method === "sso",
      );
      state.signIn = { password: "visible", sso: "visible" };
      result = await signInPage({ searchParams: Promise.resolve({}) } as any);
      expect(component(result, "PasswordSignIn")).toBeTruthy();
      expect(component(result, "SSOSignIn").props.providerId).toBe("sso");
      state.sso = undefined;
      expect(
        component(
          await signInPage({ searchParams: Promise.resolve({}) } as any),
          "SSOSignIn",
        ),
      ).toBeUndefined();
    },
  );
  it("assembles dashboard favorite cards with every entity relationship", async () => {
    state.favorites = {
      favorites: [
        { type: "agent", id: "agent" },
        { type: "documentRepository", id: "repo" },
        { type: "transcriber", id: "transcriber" },
      ],
      agents: state.agents,
    };
    const result = await DashboardFavorites();
    expect(component(result, "AgentCard").props.agent).toBe(state.agents[0]);
    expect(
      component(result, "DocumentRepositoryCard").props.documentRepository,
    ).toBe(state.repositories[0]);
    expect(component(result, "TranscriberCard").props.transcriber).toBe(
      state.transcribers[0],
    );
    state.favorites = { favorites: [] };
    expect(component(await DashboardFavorites(), "AgentCard")).toBeUndefined();
  });
});

const storageMocks = vi.hoisted(() => ({ list: vi.fn(), content: vi.fn() }));
vi.mock("@schornio/aibox-package-database/storage/list", () => ({
  list: storageMocks.list,
}));
vi.mock("@schornio/aibox-package-database/storage/getDocumentContent", () => ({
  getDocumentContent: storageMocks.content,
}));
import { Folder as RepoFolder } from "../../apps/web/app/(main)/app/documents/[documentRepositoryId]/files/_components/Folder";
import { Folder as ChatFolder } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/files/_components/Folder";
import { Folder as TranscriptionFolder } from "../../apps/web/app/(main)/app/transcribe/[transcriberId]/[activityId]/files/_components/Folder";
import { File as RepoFile } from "../../apps/web/app/(main)/app/documents/[documentRepositoryId]/files/_components/File";
import { File as ChatFile } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/files/_components/File";
import { File as TranscriptionFile } from "../../apps/web/app/(main)/app/transcribe/[transcriberId]/[activityId]/files/_components/File";
import chatPage from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/page";
import themePage from "../../apps/web/app/(settings)/settings/theme/page";
import { SidebarFavorites } from "../../apps/web/app/(main)/_components/SidebarFavorites";
describe("server storage views and application composition", () => {
  it("loads every ancestor only for column browsing and forwards the URL view", async () => {
    storageMocks.list
      .mockReset()
      .mockImplementation(async (path) => [{ path: `${path}/file.txt` }]);
    const context = component(
      await RepoFolder({
        repository: state.entity,
        path: "Reports/2026",
        view: "columns",
      }),
      "StorageContext",
    );
    expect(
      context.props.columnFolders.map((column: any) => column.path),
    ).toEqual(["", "Reports", "Reports/2026"]);
    expect(storageMocks.list.mock.calls.map(([path]) => path)).toEqual([
      "Reports/2026",
      "",
      "Reports",
    ]);
    state.inspect.mockResolvedValue({ folder: true, path: "Reports/2026" });
    const result = await repoFiles({
      params: Promise.resolve({
        documentRepositoryId: "repo",
        path: ["Reports", "2026"],
      }),
      searchParams: Promise.resolve({ view: "columns" }),
    });
    expect(component(result, "Folder").props.view).toBe("columns");
    storageMocks.list.mockClear();
    const table = component(
      await RepoFolder({ repository: state.entity, path: "Reports/2026" }),
      "StorageContext",
    );
    expect(table.props.columnFolders).toBeUndefined();
    expect(storageMocks.list).toHaveBeenCalledOnce();
  });
  it.each([RepoFolder, ChatFolder, TranscriptionFolder])(
    "builds a storage folder with normalized paths in %s",
    async (Folder) => {
      state.entity.color = { oklchHue: 140, type: "color-oklch-hue" };
      const files = [{ path: "file.txt" }];
      storageMocks.list.mockResolvedValue(files);
      const props = {
        repository: state.entity,
        agentId: "agent",
        activityId: "activity",
        transcriberId: "transcriber",
        path: "/base/",
      } as any;
      const context = component(await Folder(props), "StorageContext");
      expect(context.props.storageObjects).toBe(files);
      expect(context.props.basePathStorage).toBe("base");
      if (Folder === TranscriptionFolder)
        expect(context.props.audioRecording.appColor).toEqual(
          state.entity.color,
        );
      storageMocks.list.mockRejectedValueOnce(new Error("denied"));
      await expect(Folder(props)).rejects.toThrow("NOT_FOUND");
    },
  );
  it.each([RepoFolder, ChatFolder])(
    "only enables recording with a configured transcriber in %s",
    async (Folder) => {
      storageMocks.list.mockResolvedValue([]);
      const props = {
        repository: state.entity,
        agentId: "agent",
        activityId: "activity",
        path: "/",
      } as any;
      state.entity.transcriberIdentifier = undefined;
      expect(
        component(await Folder(props), "StorageContext").props.audioRecording,
      ).toBeUndefined();
      state.entity.transcriberIdentifier = "local-whisper";
      expect(
        component(await Folder(props), "StorageContext").props.audioRecording,
      ).toEqual({ appColor: state.entity.color });
    },
  );
  it.each([RepoFile, ChatFile, TranscriptionFile])(
    "loads content and rejects inaccessible file views in %s",
    async (File) => {
      const content = { type: "mdc", current: "Content", versions: [] };
      storageMocks.content.mockResolvedValue(content);
      const props = {
        repository: state.entity,
        agentId: "agent",
        activityId: "activity",
        transcriberId: "transcriber",
        file: { file: true, path: "file.txt" },
      } as any;
      expect(
        component(await File(props), "StorageFilePreview").props.fileContent,
      ).toBe(content);
      storageMocks.content.mockRejectedValueOnce(new Error("denied"));
      await expect(File(props)).rejects.toThrow("NOT_FOUND");
    },
  );
  it("provides route identifiers and model thinking defaults to the chat composer", async () => {
    state.workspaces = [
      { id: "workspace", name: "Workspace", claim: "user" },
    ] as any;
    state.entity.modelThinking = "mandatory-on";
    const request = {
      params: Promise.resolve({ agentId: "agent", activityId: "activity" }),
    } as any;
    const result = await chatPage(request);
    expect(component(result, "ChatContext").props).toMatchObject({
      agentId: "agent",
      activityId: "activity",
    });
    expect(
      component(result, "ChatComposeMessageContext").props.modelThinking,
    ).toBe("mandatory-on");
    state.entity = undefined;
    await expect(chatPage(request)).rejects.toThrow("NOT_FOUND");
  });
  it("shows a clear access error without opening realtime rooms for an unauthorized chat", async () => {
    state.workspaces = [{ id: "workspace", name: "Workspace" }];
    vi.mocked(getAgentContent).mockClear();
    const result = await chatPage({
      params: Promise.resolve({ agentId: "agent", activityId: "activity" }),
    } as any);
    expect(getAgentContent).not.toHaveBeenCalled();
    expect(component(result, "ChatContext")).toBeUndefined();
    expect(component(result, "ChatComposeMessageContext")).toBeUndefined();
    expect(component(result, "AlertDescription").props.children).toBe(
      "errorNoAccess",
    );
  });
  it("passes the stored theme to the editor for administrators", async () => {
    state.profile = { isAdmin: true };
    state.welcome = { de: "Willkommen", en: "Welcome" };
    state.theme = {
      version: "theme-v2",
      colors: [
        {
          id: "custom",
          name: "Custom",
          color: { type: "color-oklch-hue", oklchHue: 42 },
        },
      ],
    };
    expect(
      component(await themePage().props.children.type(), "ThemeEditor").props
        .defaultTheme,
    ).toEqual(state.theme);
    expect(
      component(await themePage().props.children.type(), "ThemeEditor").props
        .defaultWelcomeMessage,
    ).toEqual(state.welcome);
  });
  it("hides theme settings from non-administrators", async () => {
    state.profile = { isAdmin: false };
    await expect(themePage().props.children.type()).rejects.toThrow(
      "NOT_FOUND",
    );
  });
  it("assembles sidebar favorites and retains the empty state", async () => {
    state.favorites = {
      showInSidebar: true,
      favorites: [{ id: "agent", type: "agent" }],
      agents: state.agents,
      transcribers: state.transcribers,
      documentRepositories: state.repositories,
    };
    expect(
      component(await SidebarFavorites(), "SidebarFavoriteItemAgent").props
        .agent,
    ).toBe(state.agents[0]);
    state.favorites = { showInSidebar: true, favorites: [] };
    expect(
      component(await SidebarFavorites(), "SidebarFavoriteItemAgent"),
    ).toBeUndefined();
  });
});

import settingsIndex from "../../apps/web/app/(settings)/settings/page";
import { ClusterOverview } from "../../apps/web/app/(settings)/cluster/_components/ClusterOverview";
import appsIndex from "../../apps/web/app/(main)/app/page";
import permissionsPage from "../../apps/web/app/(settings)/me/permissions/page";
import resetPasswordSuccess from "../../apps/web/app/(settings)/me/reset-password-success/page";
import tasksPage from "../../apps/web/app/(settings)/tasks/page";
import activityPage from "../../apps/web/app/(main)/activity/page";
import feedbackPage from "../../apps/web/app/feedback/page";
import xragPage from "../../apps/web/app/(settings)/settings/xrag/page";
import MainLayout from "../../apps/web/app/(main)/layout";
import SettingsLayout from "../../apps/web/app/(settings)/layout";
it.each([
  [
    settingsIndex,
    [
      "/settings/user",
      "/settings/workspace",
      "/settings/connections",
      "/settings/sso",
      "/settings/xrag",
      "/settings/theme",
    ],
  ],
  [appsIndex, ["/app/documents", "/app/transcribe"]],
  [ClusterOverview, ["/service", "/tasks", "/artifacts"]],
] as const)(
  "passes navigation destinations to index cards in %s",
  async (page, paths) => {
    state.profile = { isAdmin: true };
    const cards = elements(await page()).filter(
      (element) => element.type?.name === "ContainerStyled",
    );
    expect(cards.map((card) => card.props.render.props.href)).toEqual(paths);
  },
);

import { Sidebar as SettingsSidebar } from "../../apps/web/app/(settings)/_components/Sidebar";
import publicWorkspacePage from "../../apps/web/app/(main)/workspace/[workspaceId]/page";

it.each([true, false, undefined])(
  "shows admin settings only to global admins (%s)",
  async (isAdmin) => {
    state.profile = isAdmin === undefined ? undefined : { isAdmin };
    const cards = elements(await settingsIndex()).filter(
      (element) => element.type?.name === "ContainerStyled",
    );
    const adminPaths = [
      "/settings/user",
      "/settings/workspace",
      "/settings/connections",
      "/settings/sso",
      "/settings/xrag",
    ];
    expect(cards.map((card) => card.props.render.props.href)).toEqual(
      isAdmin ? [...adminPaths, "/settings/theme"] : [],
    );
    const sidebarPaths = elements(await SettingsSidebar())
      .map((element) => element.props.render?.props.href)
      .filter(Boolean);
    for (const path of [
      ...adminPaths,
      "/models",
      "/settings",
      "/settings/theme",
      "/cluster",
      "/service",
      "/tasks",
      "/artifacts",
    ]) {
      expect(sidebarPaths.includes(path)).toBe(!!isAdmin);
    }
    expect(sidebarPaths).toContain("/me");
    expect(sidebarPaths).toContain("/");
    expect(sidebarPaths).toContain("/me/permissions");
  },
);

it.each(["user", "editor", "workspace-admin", "admin"])(
  "opens workspace details and documentation for role %s",
  async (claim) => {
    state.workspaces = [
      {
        id: "workspace",
        name: "Team",
        claim,
        description: "Team description",
        documentation: "Team handbook",
      },
    ] as any;
    const result = await publicWorkspacePage({
      params: Promise.resolve({ workspaceId: "workspace" }),
    });
    expect(component(result, "UserRoleText").props.role).toBe(claim);
    expect(
      elements(result)
        .filter((element) => element.type?.name === "MarkdownProse")
        .map((element) => element.props.children),
    ).toEqual(["Team description", "Team handbook"]);
  },
);

it("shows all workspace content regardless of favorites and excludes other workspaces", async () => {
  state.workspaces = [{ id: "workspace", name: "Team", claim: "user" }] as any;
  state.favorites = { favorites: [] };
  state.agents = [
    { id: "local-agent", workspaceId: "workspace", modelIdentifier: "model" },
    { id: "other-agent", workspaceId: "other" },
  ];
  state.repositories = [
    {
      id: "local-repo",
      workspaceId: "workspace",
      transcriberIdentifier: "local-transcriber",
    },
    { id: "other-repo", workspaceId: "other" },
  ];
  state.transcribers = [
    {
      id: "local-transcriber-id",
      identifier: "local-transcriber",
      workspaceId: "workspace",
    },
    { id: "other-transcriber", identifier: "other", workspaceId: "other" },
  ];

  const result = await publicWorkspacePage({
    params: Promise.resolve({ workspaceId: "workspace" }),
  });
  const cards = elements(result).filter((element) =>
    ["AgentCard", "DocumentRepositoryCard", "TranscriberCard"].includes(
      element.type?.name,
    ),
  );
  expect(cards).toHaveLength(3);
  expect(cards[0].props.agent.id).toBe("local-agent");
  expect(cards[0].props.model).toBe(state.models[0]);
  expect(cards[1].props.documentRepository.id).toBe("local-repo");
  expect(cards[1].props.transcriber).toBe(state.transcribers[0]);
  expect(cards[2].props.transcriber.id).toBe("local-transcriber-id");
  for (const card of cards) {
    expect(card.props.workspace).toBe(state.workspaces[0]);
    expect(card.props.favorites).toBe(state.favorites);
  }
  expect(component(result, "Empty")).toBeUndefined();
});

it("shows an empty state and keeps the role in the bottom card", async () => {
  state.workspaces = [{ id: "workspace", name: "Team", claim: "user" }] as any;
  state.agents = [];
  state.repositories = [];
  state.transcribers = [];
  const result = await publicWorkspacePage({
    params: Promise.resolve({ workspaceId: "workspace" }),
  });
  expect(component(result, "Empty")).toBeDefined();
  const containers = elements(result).filter(
    (element) => element.type?.name === "ContainerMain",
  );
  const bottom = containers.at(-1);
  expect(component(bottom, "Card")).toBeDefined();
  expect(component(bottom, "UserRoleText").props.role).toBe("user");
});

it.each([
  { workspaces: [] },
  { workspaces: [{ id: "workspace", name: "Team" }] },
])(
  "rejects missing or inaccessible workspace details (%j)",
  async ({ workspaces }) => {
    state.workspaces = workspaces;
    await expect(
      publicWorkspacePage({
        params: Promise.resolve({ workspaceId: "workspace" }),
      }),
    ).rejects.toThrow("NOT_FOUND");
  },
);
it.each([true, false])(
  "renders the empty workspace state for admin=%s",
  async (isAdmin) => {
    state.workspaces = [];
    state.profile = { isAdmin };
    const result = await permissionsPage();
    const content = elements(result);
    expect(
      content.some((element) => element.props.children === "infoEmpty"),
    ).toBe(true);
    expect(!!component(result, "EmptyContent")).toBe(isAdmin);
  },
);
it("renders workspace permissions and their descriptions", async () => {
  state.workspaces = [
    {
      id: "workspace",
      name: "Team",
      description: "Team description",
      claim: "editor",
    },
  ] as any;
  const result = await permissionsPage();
  expect(
    elements(result).some((element) => element.props.children === "Team"),
  ).toBe(true);
  expect(
    elements(result)
      .filter((element) => element.type?.name === "UserRoleText")
      .map((element) => element.props.role),
  ).toContain("editor");
});
it("provides persistent task and activity document and display preferences", async () => {
  const tasks = await tasksPage();
  expect(tasks.props.name).toContain("taskQueue");
  expect(component(tasks, "TaskTable")).toBeTruthy();
  const history = await activityPage();
  expect(component(history, "ActivityListProvider").props).toMatchObject({
    id: "/activity",
    userPreferences: { view: "table" },
  });
});
it("links the successful password reset back to the dashboard", async () => {
  expect(
    component(await resetPasswordSuccess(), "Button").props.render.props.href,
  ).toBe("/");
});
it("composes feedback and archive upload pages with their required providers", () => {
  const feedback = feedbackPage();
  expect(component(feedback, "FeedbackContext")).toBeTruthy();
  expect(component(feedback, "TextFeedback")).toBeTruthy();
  expect(component(xragPage(), "XRAGUploadProvider")).toBeTruthy();
});
it.each([MainLayout, SettingsLayout])(
  "keeps page content inside the shared realtime layout %s",
  (Layout) => {
    const result = Layout({ children: "Page body" } as any);
    const realtimeProvider = elements(result).find(
      (element) => element.type === RealtimeProvider,
    );
    expect(realtimeProvider.props.url).toBe("/v2/realtime");
    expect(
      elements(realtimeProvider).find((element) => element.type === "main")
        .props.children,
    ).toBe("Page body");
    expect(component(result, "Footer")).toBeTruthy();
  },
);

import { SidebarFooter } from "../../apps/web/app/_components/SidebarFooter";
it.each([true, false, undefined])(
  "shows the system dropdown group and its separator only to admins (%s)",
  async (isAdmin) => {
    state.profile = isAdmin === undefined ? undefined : { isAdmin };
    const result = await SidebarFooter();
    const paths = elements(result)
      .map((element) => element.props.render?.props.href)
      .filter(Boolean);
    expect(paths).toEqual(
      isAdmin ? ["/cluster", "/models", "/settings", "/", "/me"] : ["/", "/me"],
    );
    expect(!!component(result, "DropdownMenuSeparator")).toBe(!!isAdmin);
    const labels = elements(result)
      .filter((element) => element.type?.name === "DropdownMenuLabel")
      .map((element) => element.props.children);
    expect(labels).toEqual(
      isAdmin ? ["labelSystem", "labelMyAccount"] : ["labelMyAccount"],
    );
    expect(component(result, "SidebarUserSignOut")).toBeTruthy();
  },
);

import { AlreadySignedIn } from "../../apps/web/app/signin/_components/AlreadySignedIn";
it.each([
  undefined,
  {},
  { firstName: "Ada", lastName: "Lovelace", email: "ada@example.test" },
])(
  "formats optional profile names in the sidebar and signed-in view %j",
  (profile) => {
    state.profile = profile;
    return SidebarFooter().then(async (result) => {
      const button = component(result, "SidebarMenuButton");
      expect(button.props.tooltip).toEqual({
        children: profile?.firstName ? "Ada Lovelace" : "labelMyAccount",
        side: "inline-end",
      });
      const signedIn = await AlreadySignedIn({
        user: { ...profile, email: "ada@example.test" } as any,
      });
      expect(
        elements(signedIn).find((element) => element.type === "h2").props
          .children,
      ).toBe(profile?.firstName ? "Ada Lovelace" : "ada@example.test");
    });
  },
);

it.each([undefined, { firstName: "" }, { firstName: "  Ada  " }])(
  "greets optional profile names and chooses localized welcome content %j",
  (profile) => {
    state.profile = profile;
    state.welcome = { en: "Welcome text", de: "Willkommen" };
    return homePage().then((result) => {
      expect(component(result, "MarkdownProse").props.children).toBe(
        "Welcome text",
      );
      if (profile?.firstName?.trim())
        expect(
          elements(result).some(
            (element) =>
              Array.isArray(element.props.children) &&
              element.props.children.includes("Ada"),
          ),
        ).toBe(true);
    });
  },
);

import homePage from "../../apps/web/app/(main)/page";

import publicWorkspaceListPage from "../../apps/web/app/(main)/workspace/page";
import { Sidebar as MainSidebar } from "../../apps/web/app/(main)/_components/Sidebar";

it("lists accessible workspaces and joins only workspace favorites", async () => {
  state.workspaces = [
    { id: "workspace", name: "Team", claim: "user" },
    { id: "other", name: "Other", claim: "editor" },
    { id: "hidden", name: "Hidden" },
  ] as any;
  state.favorites = {
    favorites: [
      { id: "workspace", type: "workspace" },
      { id: "other", type: "agent" },
    ],
  };
  const result = await publicWorkspaceListPage();
  expect(component(result, "WorkspaceListProvider").props.workspaces).toEqual([
    { ...state.workspaces[0], favorite: true },
    { ...state.workspaces[1], favorite: false },
  ]);
  expect(component(result, "WorkspaceListProvider").props.id).toBe(
    "/workspace",
  );
});

it("resolves workspace favorites for dashboard and sidebar and hides inaccessible entries", async () => {
  state.workspaces = [{ id: "workspace", name: "Team", claim: "user" }] as any;
  state.favorites = {
    showInSidebar: true,
    favorites: [{ id: "workspace", type: "workspace" }],
  };
  expect(
    component(await DashboardFavorites(), "WorkspaceCard").props.workspace,
  ).toBe(state.workspaces[0]);
  expect(
    component(await SidebarFavorites(), "SidebarFavoriteItemWorkspace").props
      .workspace,
  ).toBe(state.workspaces[0]);
  state.workspaces = [{ id: "workspace", name: "Team" }];
  expect(
    component(await DashboardFavorites(), "WorkspaceCard"),
  ).toBeUndefined();
  expect(
    component(await SidebarFavorites(), "SidebarFavoriteItemWorkspace").props
      .workspace,
  ).toBeUndefined();
});

it("places workspaces between agents and apps in the main sidebar", async () => {
  const links = elements(await MainSidebar())
    .map((element) => element.props.render?.props.href)
    .filter(Boolean);
  expect(links.slice(0, 3)).toEqual(["/agent", "/workspace", "/app"]);
});

it.each([
  { language: "de", texts: {}, expected: undefined },
  { language: "de", texts: { en: "First text" }, expected: "First text" },
  { language: "ja", texts: { en: "First text" }, expected: "First text" },
  {
    language: "de",
    texts: { fr: "First text", en: "English text" },
    expected: "First text",
  },
  {
    language: "en",
    texts: { fr: "First text", en: "English text" },
    expected: "English text",
  },
  {
    language: "en",
    texts: { de: " ", fr: "Remaining text", en: "" },
    expected: "Remaining text",
  },
  {
    language: "de",
    texts: { en: "Remaining text" },
    expected: "Remaining text",
  },
  { language: "de", texts: { en: " " }, expected: undefined },
])(
  "shares theme variants across all public consumers (%j)",
  async ({ language, texts, expected }) => {
    const previous = vi.mocked(getT).getMockImplementation();
    vi.mocked(getT).mockImplementation(
      async () =>
        ({
          lng: language,
          t: (key: string) => key,
          i18n: { languages: [language, "en", "de"] },
        }) as any,
    );
    try {
      state.welcome = texts;
      state.signIn = { password: "hidden", sso: "hidden" };
      state.theme.logo = Object.fromEntries(
        Object.entries(texts).map(([key, value]) => [
          key,
          {
            url: value?.trim() ? `/logos/${key}.svg` : "",
            alt: value,
          },
        ]),
      );
      const home = await homePage();
      const signin = await signInPage({
        searchParams: Promise.resolve({}),
      } as any);
      for (const page of [home, signin]) {
        expect(component(page, "MarkdownProse").props.children).toBe(
          expected ?? "_welcomeMessage",
        );
      }
      const logo = await LogoData({});
      if (expected) {
        expect(logo.type).toBe("img");
        expect(logo.props.alt).toBe(expected);
      } else {
        expect(logo.type).not.toBe("img");
      }
    } finally {
      vi.mocked(getT).mockImplementation(previous!);
    }
  },
);

import modelsPage from "../../apps/web/app/(settings)/models/page";
import modelDetailPage from "../../apps/web/app/(settings)/models/[modelId]/page";
it("protects model routes from non-admin users", async () => {
  state.profile = { isAdmin: false };
  await expect(modelsPage()).rejects.toThrow("NOT_FOUND");
  await expect(
    modelDetailPage({ params: Promise.resolve({ modelId: "any" }) }),
  ).rejects.toThrow("NOT_FOUND");
});
it("returns not found for an unknown model", async () => {
  state.profile = { isAdmin: true };
  state.models = [];
  await expect(
    modelDetailPage({ params: Promise.resolve({ modelId: "missing" }) }),
  ).rejects.toThrow("NOT_FOUND");
});

it.each(["user", "editor", undefined])(
  "blocks transcriber editor routes for %s",
  async (claim) => {
    state.workspaces = [{ id: "workspace", name: "Workspace", claim }];
    await expect(newTranscriber()).rejects.toThrow("NOT_FOUND");
    await expect(editTranscriber(params())).rejects.toThrow("NOT_FOUND");
  },
);
it("blocks editing a transcriber in a different workspace", async () => {
  state.workspaces = [{ id: "other", name: "Other", claim: "workspace-admin" }];
  await expect(editTranscriber(params())).rejects.toThrow("NOT_FOUND");
});

it("hides sidebar favorites without removing dashboard favorites", async () => {
  state.workspaces = [{ id: "workspace", name: "Team", claim: "user" }];
  state.favorites = {
    showInSidebar: false,
    favorites: [{ id: "workspace", type: "workspace" }],
  };
  expect(await SidebarFavorites()).toBeNull();
  expect(
    component(await DashboardFavorites(), "WorkspaceCard").props.workspace,
  ).toBe(state.workspaces[0]);
});
