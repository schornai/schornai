// @vitest-environment jsdom
import "./client-setup";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  WorkspaceListProvider,
  useWorkspaceList,
} from "../../apps/web/app/(main)/workspace/_components/WorkspaceListProvider";
import {
  WorkspaceEditPermissionListProvider,
  useWorkspaceEditPermissionList,
} from "../../apps/web/app/(settings)/settings/workspace/[workspaceId]/_components/WorkspaceEditPermissionListProvider";
import { NO_GROUP_KEY } from "../../apps/web/lib/groupSortView/hook";
vi.mock("@/lib/groupSortView/action", () => ({ savePreferences: vi.fn() }));
afterEach(cleanup);
const workspaces = [
  { id: "beta", name: "Beta", description: "Shared research", favorite: true },
  { id: "unnamed", favorite: false },
  { id: "alpha", name: "Alpha", favorite: false },
] as any;
it.each([
  ["favorite", ["favorite", NO_GROUP_KEY]],
  ["first-letter", ["", "A", "B"]],
  ["no-group", [NO_GROUP_KEY]],
])(
  "groups workspace navigation by %s even when names are absent",
  (group, keys) => {
    const { result } = renderHook(useWorkspaceList, {
      wrapper: ({ children }) => (
        <WorkspaceListProvider
          id="navigation"
          userPreferences={{ group: group as string, sort: "name:asc" }}
          workspaces={workspaces}
        >
          {children}
        </WorkspaceListProvider>
      ),
    });
    expect(result.current.itemGroups.map(([key]) => key)).toEqual(keys);
    expect(
      result.current.itemGroups
        .flatMap(([, items]) => items)
        .map((item) => item.id),
    ).toEqual(
      group === "favorite"
        ? ["beta", "unnamed", "alpha"]
        : ["unnamed", "alpha", "beta"],
    );
  },
);
it("filters workspace descriptions and reports misuse outside the provider", async () => {
  const { result } = renderHook(useWorkspaceList, {
    wrapper: ({ children }) => (
      <WorkspaceListProvider
        id="navigation"
        userPreferences={{}}
        workspaces={workspaces}
      >
        {children}
      </WorkspaceListProvider>
    ),
  });
  act(() => result.current.setFilter("research"));
  await waitFor(() =>
    expect(
      result.current.itemGroups
        .flatMap(([, items]) => items)
        .map((item) => item.id),
    ).toEqual(["beta"]),
  );
  expect(() => renderHook(useWorkspaceList)).toThrow("outside provider");
});
it.each(["name:asc", "name:desc", "email:asc", "email:desc"])(
  "sorts workspace membership with absent names and emails: %s",
  (sort) => {
    const users = [
      { id: "b", name: "Beta", email: "b@test", workspaceRole: "user" },
      { id: "missing", workspaceRole: "user" },
      { id: "a", name: "Alpha", email: "a@test", workspaceRole: "user" },
    ] as any;
    const { result } = renderHook(useWorkspaceEditPermissionList, {
      wrapper: ({ children }) => (
        <WorkspaceEditPermissionListProvider
          id="members"
          userPreferences={{ group: "permission", sort }}
          users={users}
        >
          {children}
        </WorkspaceEditPermissionListProvider>
      ),
    });
    expect(result.current.itemGroups[0][1].map((item) => item.id)).toEqual(
      sort.endsWith("asc") ? ["missing", "a", "b"] : ["b", "a", "missing"],
    );
  },
);
it("groups unnamed members separately by first letter", () => {
  const { result } = renderHook(useWorkspaceEditPermissionList, {
    wrapper: ({ children }) => (
      <WorkspaceEditPermissionListProvider
        id="members"
        userPreferences={{ group: "first-letter" }}
        users={[{ id: "missing" }, { id: "named", name: "Alpha" }] as any}
      >
        {children}
      </WorkspaceEditPermissionListProvider>
    ),
  });
  expect(result.current.itemGroups.map(([key]) => key)).toEqual(["", "A"]);
});
