// @vitest-environment jsdom
import "./client-setup";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { client } from "./client-setup";
import { AgentListProvider } from "../../apps/web/app/(main)/agent/_components/AgentListProvider";
import { AgentList } from "../../apps/web/app/(main)/agent/_components/AgentList";
import { DocumentRepositoryListProvider } from "../../apps/web/app/(main)/app/documents/_components/DocumentRepositoryListProvider";
import { DocumentRepositoryList } from "../../apps/web/app/(main)/app/documents/_components/DocumentRepositoryList";
import { TranscriberListProvider } from "../../apps/web/app/(main)/app/transcribe/_components/TranscriberListProvider";
import { TranscriberList } from "../../apps/web/app/(main)/app/transcribe/_components/TranscriberList";
import { TranscriberIconGroupActions } from "../../apps/web/app/(main)/app/transcribe/_components/TranscriberIconGroupActions";

it("opens a new transcription at the recording panel from the transcriber actions", () => {
  render(<TranscriberIconGroupActions transcriber={{ id: "recorder" }} />);
  fireEvent.click(screen.getByRole("button", { name: "tooltipRecord" }));
  expect(client.push.mock.lastCall![0]).toMatch(
    /^\/app\/transcribe\/recorder\/[0-9a-f-]+\/files#record$/,
  );
});
import { UserListProvider } from "../../apps/web/app/(settings)/settings/user/_components/UserListProvider";
import { UserList } from "../../apps/web/app/(settings)/settings/user/_components/UserList";
import { WorkspaceListProvider } from "../../apps/web/app/(settings)/settings/workspace/_components/WorkspaceListProvider";
import { WorkspaceList } from "../../apps/web/app/(settings)/settings/workspace/_components/WorkspaceList";
vi.mock("@/lib/groupSortView/action", () => ({ savePreferences: vi.fn() }));
vi.mock("../../apps/web/app/(main)/_actions/updateFavorite", () => ({
  updateFavorite: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => {
  client.params = new URLSearchParams();
  client.execute.mockClear();
  client.push.mockClear();
});
const workspace: any = {
  id: "workspace",
  name: "Workspace",
  claim: "workspace-admin",
};
const model: any = {
  id: "model",
  identifier: "model",
  name: "AI Model",
  type: "ollama-v1",
  model: "model",
  capabilities: { imageInput: true },
};
const icon = { type: "icon-lucide", iconName: "bot" };
const color = { type: "color-oklch-hue", oklchHue: 200 };
const agent: any = {
  id: "agent",
  name: "Agent Alpha",
  description: "Description",
  icon,
  color,
  workspaceId: "workspace",
  modelIdentifier: "model",
  roles: [
    {
      id: "role",
      prompt: "Prompt",
      documentRepositoryMounts: [
        { documentRepositoryIdentifier: "repository", mount: "/docs" },
      ],
    },
  ],
  favorite: true,
  additionalFunctions: {},
  recommendedMessages: [],
  documentation: "",
};
const repo: any = {
  id: "repo",
  identifier: "repository",
  name: "Repository Alpha",
  description: "Documents",
  icon,
  color,
  workspaceId: "workspace",
  transcriberIdentifier: "transcriber",
  index: {
    keyword: { active: true },
    embedding: { active: true, modelIdentifier: "model" },
  },
  favorite: true,
};
const transcriber: any = {
  id: "transcriber",
  identifier: "transcriber",
  name: "Transcriber Alpha",
  description: "Audio",
  icon,
  color,
  workspaceId: "workspace",
  modelIdentifier: "model",
  prompt: "Words",
  favorite: true,
};
const favorites: any = {
  version: "favorites-v2",
  showInSidebar: true,
  favorites: [
    { type: "agent", id: "agent" },
    { type: "documentRepository", id: "repo" },
    { type: "transcriber", id: "transcriber" },
  ],
};
const cases: any[] = [
  [
    "agents",
    AgentListProvider,
    AgentList,
    "agentsWithFavorite",
    agent,
    "/agent/agent",
    [
      "favorite",
      "first-letter",
      "workspace",
      "model",
      "document-repository",
      "role-count",
    ],
  ],
  [
    "repositories",
    DocumentRepositoryListProvider,
    DocumentRepositoryList,
    "documentRepositoriesWithFavorite",
    repo,
    "/app/documents/repo",
    ["favorite", "first-letter", "workspace", "embedding-model", "transcriber"],
  ],
  [
    "transcribers",
    TranscriberListProvider,
    TranscriberList,
    "transcriberWithFavorite",
    transcriber,
    "/app/transcribe/transcriber",
    ["favorite", "first-letter", "workspace", "model"],
  ],
];
for (const [label, Provider, List, dataProp, entity, href, groups] of cases) {
  const mount = (
    view: string,
    group: string,
    data = [entity],
    relations = true,
  ) =>
    render(
      <Provider
        {...{
          [dataProp]: data,
          id: label,
          userPreferences: { view, group, sort: "name:asc" },
        }}
      >
        <List
          documentRepositories={relations ? [repo] : []}
          transcribers={relations ? [transcriber] : []}
          models={relations ? [model] : []}
          workspaceClaims={{ claims: relations ? [workspace] : [] }}
          favorites={favorites}
        />
      </Provider>,
    );
  describe(`${label} catalog`, () => {
    for (const view of ["cards", "table"]) {
      it.each(groups)(
        `renders ${view} grouped by %s with links to each entity`,
        (group) => {
          mount(view, group);
          if (view === "table") {
            expect(
              screen
                .getAllByRole("link")
                .some((link) => link.getAttribute("href")?.startsWith(href)),
            ).toBe(true);
          } else {
            fireEvent.click(
              screen.getByRole("button", { name: new RegExp(entity.name) }),
            );
            expect(client.push.mock.lastCall![0]).toMatch(
              new RegExp(`^${href}`),
            );
          }
          expect(screen.getAllByText(entity.name).length).toBeGreaterThan(0);
          expect(
            (
              screen.getByPlaceholderText(
                "placeholderSearch",
              ) as HTMLInputElement
            ).value,
          ).toBe("");
        },
      );
      it(`handles absent relationships and empty ${view}`, () => {
        const missing = {
          ...entity,
          id: "other",
          name: "Other Item",
          favorite: false,
          workspaceId: "missing",
          modelIdentifier: "missing",
          transcriberIdentifier: undefined,
          index: undefined,
          roles: [],
        };
        const viewResult = mount(view, "favorite", [missing], false);
        expect(screen.getByText("Other Item")).toBeTruthy();
        if (label === "agents" && view === "cards") {
          const startChat = screen.getByRole("button", { name: /Other Item/ });
          expect((startChat as HTMLButtonElement).disabled).toBe(true);
          fireEvent.click(startChat);
          expect(client.push).not.toHaveBeenCalled();
        }
        viewResult.unmount();
        mount(view, "favorite", [], false);
        expect(screen.queryByText("Other Item")).toBeNull();
        if (view === "table")
          expect(screen.getByText("emptyTitle")).toBeTruthy();
      });
    }
    it("filters entries using the visible search input", async () => {
      mount("table", "first-letter");
      fireEvent.change(screen.getByPlaceholderText("placeholderSearch"), {
        target: { value: "zzzz no match" },
      });
      await waitFor(() => expect(screen.queryByText(entity.name)).toBeNull());
      expect(screen.getByText("emptyTitle")).toBeTruthy();
    });
  });
}
describe("settings tables", () => {
  const users: any[] = [
    {
      id: "user",
      name: "Ada",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.test",
      signInMethod: "email",
      lastSignInAt: new Date(),
    },
    { id: "user2", name: "Grace", signInMethod: "sso" },
  ];
  it.each(["first-letter", "sign-in-method", "last-login"])(
    "displays user details grouped by %s",
    (group) => {
      render(
        <UserListProvider id="users" users={users} userPreferences={{ group }}>
          <UserList />
        </UserListProvider>,
      );
      expect(
        screen.getByRole("link", { name: "Ada" }).getAttribute("href"),
      ).toBe("/settings/user/user");
      expect(screen.getByText("ada@example.test")).toBeTruthy();
      expect(screen.getByRole("link", { name: "Grace" })).toBeTruthy();
    },
  );
  it("filters users from the search field", async () => {
    render(
      <UserListProvider id="users" users={users} userPreferences={{}}>
        <UserList />
      </UserListProvider>,
    );
    fireEvent.change(screen.getByPlaceholderText("placeholderSearch"), {
      target: { value: "Ada" },
    });
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: "Grace" })).toBeNull(),
    );
  });
  it.each(["first-letter", "no-group"])(
    "displays workspace descriptions and edit destinations with %s",
    (group) => {
      render(
        <WorkspaceListProvider
          id="workspaces"
          workspaces={
            [
              { ...workspace, description: "Team Space" },
              { id: "empty", name: "" },
            ] as any
          }
          userPreferences={{ group }}
        >
          <WorkspaceList />
        </WorkspaceListProvider>,
      );
      expect(
        screen.getByRole("link", { name: "Workspace" }).getAttribute("href"),
      ).toBe("/settings/workspace/workspace");
      expect(screen.getByText("Team Space")).toBeTruthy();
    },
  );
});

import { WorkspaceListProvider as PublicWorkspaceListProvider } from "../../apps/web/app/(main)/workspace/_components/WorkspaceListProvider";
import { WorkspaceList as PublicWorkspaceList } from "../../apps/web/app/(main)/workspace/_components/WorkspaceList";
import { WorkspaceListOptionsDropdown as PublicWorkspaceOptions } from "../../apps/web/app/(main)/workspace/_components/WorkspaceListOptionsDropdown";

describe("public workspace catalog", () => {
  const workspaces: any[] = [
    { ...workspace, name: "Alpha", description: "Engineering", favorite: true },
    {
      id: "beta",
      name: "Beta",
      description: "Marketing",
      claim: "user",
      favorite: false,
    },
  ];
  function catalog(view = "cards", group = "no-group", data = workspaces) {
    return render(
      <PublicWorkspaceListProvider
        id="/workspace"
        workspaces={data}
        userPreferences={{ view, group, sort: "name:asc" }}
      >
        <PublicWorkspaceOptions />
        <PublicWorkspaceList
          favorites={{
            ...favorites,
            favorites: [{ id: "workspace", type: "workspace" }],
          }}
        />
      </PublicWorkspaceListProvider>,
    );
  }
  it.each(["cards", "table"])(
    "opens public workspace destinations and filters %s by description",
    async (view) => {
      catalog(view);
      expect(
        screen.getByRole("link", { name: /Alpha/ }).getAttribute("href"),
      ).toBe("/workspace/workspace");
      expect(
        screen.getByRole("link", { name: /Beta/ }).getAttribute("href"),
      ).toBe("/workspace/beta");
      fireEvent.change(screen.getByRole("textbox", { name: "labelSearch" }), {
        target: { value: "Engineering" },
      });
      await waitFor(() =>
        expect(screen.queryByRole("link", { name: /Beta/ })).toBeNull(),
      );
      expect(screen.getByRole("link", { name: /Alpha/ })).toBeTruthy();
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "no match whatsoever" },
      });
      await waitFor(() =>
        expect(screen.getByText("labelNoResults")).toBeTruthy(),
      );
    },
  );
  it.each(["cards", "table"])(
    "shows favorites and other workspaces in %s",
    (view) => {
      catalog(view, "favorite");
      expect(screen.getByText("labelFavorites")).toBeTruthy();
      expect(screen.getByText("labelOtherWorkspaces")).toBeTruthy();
    },
  );
  it("shows an empty state", () => {
    catalog("cards", "no-group", []);
    expect(screen.getByText("labelEmpty")).toBeTruthy();
  });
  it("changes the view using the same URL preferences as other catalogs", async () => {
    client.pathname = "/workspace";
    catalog();
    fireEvent.click(screen.getByRole("button", { name: "labelOptions" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "labelView" }));
    fireEvent.click(
      await screen.findByRole("menuitemradio", { name: "labelTable" }),
    );
    expect(client.push).toHaveBeenCalledWith("/workspace?view=table");
  });
});
