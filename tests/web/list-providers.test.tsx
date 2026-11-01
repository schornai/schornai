// @vitest-environment jsdom
import "./client-setup";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { client } from "./client-setup";
import { NO_GROUP_KEY } from "../../apps/web/lib/groupSortView/hook";
import {
  AgentListProvider,
  useAgentList,
} from "../../apps/web/app/(main)/agent/_components/AgentListProvider";
import {
  DocumentRepositoryListProvider,
  useDocumentRepositoryList,
} from "../../apps/web/app/(main)/app/documents/_components/DocumentRepositoryListProvider";
import {
  TranscriberListProvider,
  useTranscriberList,
} from "../../apps/web/app/(main)/app/transcribe/_components/TranscriberListProvider";
import {
  WorkspaceListProvider,
  useWorkspaceList,
} from "../../apps/web/app/(settings)/settings/workspace/_components/WorkspaceListProvider";
import {
  UserListProvider,
  useUserList,
} from "../../apps/web/app/(settings)/settings/user/_components/UserListProvider";
import {
  ActivityListProvider,
  useActivityList,
} from "../../apps/web/app/(main)/activity/_components/ActivityListProvider";
const state = vi.hoisted(() => ({ activities: [] as any[] }));
vi.mock("@/lib/groupSortView/action", () => ({ savePreferences: vi.fn() }));
vi.mock(
  "../../apps/web/app/(main)/_components/ActivityContextProvider",
  () => ({ useActivites: () => state }),
);
afterEach(cleanup);
beforeEach(() => {
  client.params = new URLSearchParams();
});
const role = {
  documentRepositoryMounts: [{ documentRepositoryIdentifier: "docs" }],
};
const agents: any[] = [
  {
    id: "b",
    name: " Beta ",
    description: "second",
    modelIdentifier: "model-b",
    workspaceId: "workspace-b",
    favorite: false,
    roles: [],
  },
  {
    id: "a",
    name: "Alpha",
    description: "first",
    modelIdentifier: "model-a",
    workspaceId: "workspace-a",
    favorite: true,
    roles: [role],
  },
];
const repos: any[] = [
  { id: "b", name: "Beta", favorite: false },
  {
    id: "a",
    name: "Alpha",
    favorite: true,
    workspaceId: "workspace",
    transcriberIdentifier: "transcriber",
    index: { embedding: { modelIdentifier: "embedding" } },
  },
];
const transcribers: any[] = [
  { id: "b", name: "Beta", favorite: false, workspaceId: "z" },
  {
    id: "a",
    name: "Alpha",
    favorite: true,
    modelIdentifier: "whisper",
    workspaceId: "a",
  },
];
const cases: any[] = [
  [
    "agents",
    AgentListProvider,
    useAgentList,
    "agentsWithFavorite",
    agents,
    [
      ["favorite", ["favorite", NO_GROUP_KEY]],
      ["first-letter", ["A", "B"]],
      ["workspace", ["workspace-a", "workspace-b"]],
      ["model", ["model-a", "model-b"]],
      ["document-repository", ["docs", NO_GROUP_KEY]],
      ["role-count", ["0", "1"]],
    ],
  ],
  [
    "repositories",
    DocumentRepositoryListProvider,
    useDocumentRepositoryList,
    "documentRepositoriesWithFavorite",
    repos,
    [
      ["favorite", ["favorite", NO_GROUP_KEY]],
      ["first-letter", ["A", "B"]],
      ["workspace", ["workspace", NO_GROUP_KEY]],
      ["embedding-model", ["embedding", NO_GROUP_KEY]],
      ["transcriber", ["transcriber", NO_GROUP_KEY]],
    ],
  ],
  [
    "transcribers",
    TranscriberListProvider,
    useTranscriberList,
    "transcriberWithFavorite",
    transcribers,
    [
      ["favorite", ["favorite", NO_GROUP_KEY]],
      ["first-letter", ["A", "B"]],
      ["workspace", ["a", "z"]],
      ["model", ["whisper", NO_GROUP_KEY]],
    ],
  ],
  [
    "workspaces",
    WorkspaceListProvider,
    useWorkspaceList,
    "workspaces",
    [
      { id: "b", name: "Beta" },
      { id: "a", name: undefined },
    ],
    [["first-letter", ["", "B"]]],
  ],
];
for (const [label, Provider, useList, dataProp, data, groups] of cases) {
  describe(`${label} list`, () => {
    for (const [group, expectedKeys] of groups) {
      it(`groups by ${group}, retaining every item`, () => {
        const wrapper = ({ children }: any) => (
          <Provider
            {...{
              [dataProp]: data,
              id: label,
              userPreferences: { group, sort: "name:asc" },
            }}
          >
            {children}
          </Provider>
        );
        const { result } = renderHook(useList, { wrapper });
        expect(result.current.itemGroups.map(([key]: any) => key)).toEqual(
          expectedKeys,
        );
        expect(
          result.current.itemGroups.flatMap(([, values]: any) => values),
        ).toHaveLength(data.length);
      });
    }
    it("rejects use without its provider", () => {
      expect(() => renderHook(useList)).toThrow(/outside provider/);
    });
    it("filters text and supports an empty list", async () => {
      const wrapper = ({ children }: any) => (
        <Provider {...{ [dataProp]: data, id: label, userPreferences: {} }}>
          {children}
        </Provider>
      );
      const { result } = renderHook(useList, { wrapper });
      act(() => result.current.setFilter("definitely not an item"));
      await waitFor(() => expect(result.current.itemGroups).toEqual([]));
    });
  });
}
describe("user lists", () => {
  const today = new Date();
  const users: any[] = [
    {
      id: "today",
      name: "Alpha",
      email: "a@example.test",
      signInMethod: "password",
      lastSignInAt: today,
    },
    {
      id: "week",
      name: "Beta",
      email: "z@example.test",
      signInMethod: "sso",
      lastSignInAt: new Date(+today - 3 * 86400000),
    },
    {
      id: "month",
      name: "Gamma",
      lastSignInAt: new Date(+today - 15 * 86400000),
    },
    { id: "old", lastSignInAt: new Date(+today - 45 * 86400000) },
    { id: "never" },
  ];
  const mount = (preferences: any) =>
    renderHook(useUserList, {
      wrapper: ({ children }) => (
        <UserListProvider
          users={users}
          id="users"
          userPreferences={preferences}
        >
          {children}
        </UserListProvider>
      ),
    });
  it("groups recent logins and leaves old/missing ones ungrouped", () => {
    const { result } = mount({ group: "last-login", sort: "last-login:desc" });
    expect(new Map(result.current.itemGroups).get("today")?.[0].id).toBe(
      "today",
    );
    expect(new Map(result.current.itemGroups).get("last7Days")?.[0].id).toBe(
      "week",
    );
    expect(new Map(result.current.itemGroups).get("last30Days")?.[0].id).toBe(
      "month",
    );
    expect(
      new Map(result.current.itemGroups).get(NO_GROUP_KEY)?.map((x) => x.id),
    ).toEqual(["old", "never"]);
  });
  it.each(["first-letter", "sign-in-method"])(
    "groups by %s and preserves all users",
    (group) => {
      const { result } = mount({ group, sort: "email:asc" });
      expect(result.current.itemGroups.flatMap(([, x]) => x)).toHaveLength(5);
    },
  );
  it("sorts nullable names and refuses missing provider", () => {
    expect(
      mount({ sort: "name:asc" }).result.current.itemGroups[0][1].map(
        (x) => x.id,
      ),
    ).toEqual(["old", "never", "today", "week", "month"]);
    expect(() => renderHook(useUserList)).toThrow(/outside provider/);
  });
});
describe("activity lists", () => {
  const now = new Date();
  beforeEach(() => {
    state.activities = [0, 3, 15, 45].map((days, index) => ({
      id: `${index}`,
      label: ["Alpha", "Beta", "Gamma", "Delta"][index],
      pinned: index === 0,
      state: ["running", "idle", "success", "error"][index],
      content:
        index === 3
          ? undefined
          : { type: ["chat", "transcription", "reindex"][index] },
      createdAtISO: new Date(+now - days * 86400000).toISOString(),
      updatedAtISO: new Date(+now - days * 86400000).toISOString(),
    }));
  });
  const mount = (group: string, sort: string) =>
    renderHook(useActivityList, {
      wrapper: ({ children }) => (
        <ActivityListProvider id="activity" userPreferences={{ group, sort }}>
          {children}
        </ActivityListProvider>
      ),
    });
  it.each([
    ["pinned", ["pinned", NO_GROUP_KEY]],
    ["state", ["running", "idle", "success", "error"]],
    ["type", ["chat", "transcription", "reindex", NO_GROUP_KEY]],
    ["updated", ["today", "last7Days", "last30Days", NO_GROUP_KEY]],
    ["created", ["today", "last7Days", "last30Days", NO_GROUP_KEY]],
  ])("orders %s groups with ungrouped last", (group, keys) => {
    expect(
      mount(group as string, "updated:desc").result.current.itemGroups.map(
        ([key]) => key,
      ),
    ).toEqual(keys);
  });
  it.each(["created:asc", "label:asc"])(
    "sorts %s in one ungrouped collection",
    (sort) => {
      const items = mount("unknown", sort).result.current.itemGroups;
      expect(items[0][0]).toBe(NO_GROUP_KEY);
      expect(items[0][1].map((x) => x.id)).toEqual(
        sort === "created:asc" ? ["3", "2", "1", "0"] : ["0", "1", "3", "2"],
      );
    },
  );
  it("rejects missing provider", () => {
    expect(() => renderHook(useActivityList)).toThrow(/outside provider/);
  });
});
