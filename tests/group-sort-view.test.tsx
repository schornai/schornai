// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NO_GROUP_KEY,
  toKey,
  useGroupSortView,
} from "../apps/web/lib/groupSortView/hook";
const state = vi.hoisted(() => ({
  params: new URLSearchParams(),
  push: vi.fn(),
  execute: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => state.params,
  usePathname: () => "/agents",
  useRouter: () => ({ push: state.push }),
}));
vi.mock("@/lib/groupSortView/action", () => ({ savePreferences: vi.fn() }));
vi.mock("next-safe-action/hooks", () => ({
  useAction: () => ({ execute: state.execute, isPending: false }),
}));
afterEach(cleanup);
beforeEach(() => {
  state.params = new URLSearchParams();
  state.push.mockClear();
  state.execute.mockClear();
});
const data = [
  { id: 3, groups: new Set(["B", "A"]) },
  { id: 1, groups: new Set<string>() },
  { id: 2, groups: new Set(["A"]) },
];
const functions = {
  group: (_: string, item: (typeof data)[number]) => item.groups,
  groupSort: (_: string, a: string, b: string) => a.localeCompare(b),
  sort: (_: string, a: (typeof data)[number], b: (typeof data)[number]) =>
    a.id - b.id,
};

describe("group/sort/view preferences", () => {
  it("uses defaults, sorts groups, duplicates multiple membership and puts ungrouped items last", () => {
    const defaults = { group: "group", sort: "id:asc", view: "table" };
    const hook = renderHook(() =>
      useGroupSortView("agents", data, functions, undefined, defaults),
    );
    expect(hook.result.current.itemGroups).toEqual([
      ["A", [data[2], data[0]]],
      ["B", [data[0]]],
      [NO_GROUP_KEY, [data[1]]],
    ]);
    expect(hook.result.current.isDefaultPreferences).toBe(true);
    expect(hook.result.current.isUserPreferences).toBe(true);
    expect(toKey(NO_GROUP_KEY)).toBe("NO_GROUP");
    expect(toKey("A")).toBe("GROUP_A");
    act(() => hook.result.current.savePreferences());
    expect(state.execute).toHaveBeenCalledWith({
      id: "agents",
      preferences: defaults,
    });
  });
  it("lets URL values override user preferences and sorts descending", () => {
    state.params = new URLSearchParams("sort=id:desc&view=cards&group=group");
    const hook = renderHook(() =>
      useGroupSortView("agents", data, functions, {
        view: "table",
        sort: "id:asc",
      }),
    );
    expect(hook.result.current.itemGroups[0]).toEqual([
      "A",
      [data[0], data[2]],
    ]);
    expect(hook.result.current.view).toBe("cards");
    expect(hook.result.current.isUserPreferences).toBe(false);
  });
  it("preserves unrelated search parameters and removes parameters equal to defaults", () => {
    state.params = new URLSearchParams("filter=alpha");
    const hook = renderHook(() =>
      useGroupSortView("agents", data, functions, undefined, {
        group: "workspace",
        sort: "id:asc",
        view: "table",
      }),
    );
    act(() => hook.result.current.setGroup("group"));
    expect(state.push).toHaveBeenLastCalledWith(
      "/agents?filter=alpha&group=group",
    );
    act(() => hook.result.current.setGroup("workspace"));
    expect(state.push).toHaveBeenLastCalledWith("/agents?filter=alpha");
    act(() => hook.result.current.setSort("id:desc"));
    expect(state.push).toHaveBeenLastCalledWith(
      "/agents?filter=alpha&sort=id%3Adesc",
    );
    act(() => hook.result.current.setSort("id:asc"));
    expect(state.push).toHaveBeenLastCalledWith("/agents?filter=alpha");
    act(() => hook.result.current.setView("cards"));
    expect(state.push).toHaveBeenLastCalledWith(
      "/agents?filter=alpha&view=cards",
    );
    act(() => hook.result.current.setView("table"));
    expect(state.push).toHaveBeenLastCalledWith("/agents?filter=alpha");
  });
  it("supports custom parameter names, resetting and ungrouped/unsorted input", () => {
    state.params = new URLSearchParams("g=group&s=id:asc&v=cards");
    const hook = renderHook(() =>
      useGroupSortView("agents", data, functions, undefined, undefined, {
        searchParamNameGroup: "g",
        searchParamNameSort: "s",
        searchParamNameView: "v",
      }),
    );
    act(() => hook.result.current.resetPreferences());
    expect(state.push).toHaveBeenLastCalledWith("/agents");
    state.params = new URLSearchParams();
    const plain = renderHook(() => useGroupSortView("plain", data));
    expect(plain.result.current.itemGroups).toEqual([[NO_GROUP_KEY, data]]);
    expect(plain.result.current.isDefaultPreferences).toBeUndefined();
    const single = renderHook(() =>
      useGroupSortView(
        "plain",
        data,
        { group: (_, item) => (item.id === 1 ? NO_GROUP_KEY : "all") },
        undefined,
        { group: "group" },
      ),
    );
    expect(single.result.current.itemGroups).toEqual([
      ["all", [data[0], data[2]]],
      [NO_GROUP_KEY, [data[1]]],
    ]);
  });
});
