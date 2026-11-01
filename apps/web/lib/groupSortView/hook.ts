"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Preferences } from "@/lib/groupSortView/types";
import { savePreferences as savePreferencesAction } from "@/lib/groupSortView/action";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";

export type GroupSortFunctions<
  TData,
  TGroup extends string,
  TSort extends string,
> = {
  group?: (
    group: TGroup | (string & {}),
    item: TData,
  ) => string | Set<string> | typeof NO_GROUP_KEY;
  groupSort?: (group: string, groupKeyA: string, groupKeyB: string) => number;
  sort?: (sort: TSort | (string & {}), itemA: TData, itemB: TData) => number;
};

export const NO_GROUP_KEY = Symbol();

export function toKey(group: string | symbol) {
  if (group === NO_GROUP_KEY) {
    return "NO_GROUP";
  }
  return `GROUP_${group as string}`;
}

function updateSearchParams(
  searchParams: URLSearchParams,
  ...newParams: { key: string; value?: string }[]
) {
  const newSearchParams = new URLSearchParams(searchParams);
  for (const { key, value } of newParams) {
    if (value) {
      newSearchParams.set(key, value);
    } else {
      newSearchParams.delete(key);
    }
  }
  return newSearchParams;
}

function getHref(pathname: string, searchParams: URLSearchParams) {
  if (searchParams.size === 0) {
    return pathname;
  }
  return `${pathname}?${searchParams}`;
}

function preferencesEqual(
  preferencesA?: Preferences,
  preferenceB?: Preferences,
) {
  return (
    preferencesA &&
    preferenceB &&
    preferencesA.group === preferenceB.group &&
    preferencesA.sort === preferenceB.sort &&
    preferencesA.view === preferenceB.view
  );
}

export function useGroupSortView<
  TData,
  TGroup extends string,
  TSort extends string,
  TView extends string,
>(
  id: string,
  data: TData[],
  functions?: GroupSortFunctions<TData, TGroup, TSort>,
  userPreferences?: Preferences,
  defaultPreferences?: Preferences,
  config?: {
    searchParamNameGroup?: string;
    searchParamNameSort?: string;
    searchParamNameView?: string;
  },
) {
  const searchParamNameGroup = config?.searchParamNameGroup ?? "group";
  const searchParamNameSort = config?.searchParamNameSort ?? "sort";
  const searchParamNameView = config?.searchParamNameView ?? "view";

  const searchParams = useSearchParams();

  const defaultGroup = userPreferences?.group ?? defaultPreferences?.group;
  const group = (searchParams.get(searchParamNameGroup) ?? defaultGroup) as
    | TGroup
    | (string & {})
    | undefined;

  const defaultSort = userPreferences?.sort ?? defaultPreferences?.sort;
  const [sort, sortDirection] = ((
    searchParams.get(searchParamNameSort) ?? defaultSort
  )?.split(":") ?? []) as [
    TSort | (string & {}) | undefined,
    "asc" | "desc" | (string & {}) | undefined,
  ];

  const defaultView = userPreferences?.view ?? defaultPreferences?.view;
  const view = (searchParams.get(searchParamNameView) ?? defaultView) as TView;

  const preferences = {
    group,
    sort: `${sort}:${sortDirection ?? "asc"}`,
    view,
  };

  const fnGroup = functions?.group;
  const fnGroupSort = functions?.groupSort;
  const fnSort = functions?.sort;

  const sortedData =
    sort && fnSort
      ? data.toSorted(
          (itemA, itemB) =>
            fnSort(sort, itemA, itemB) * (sortDirection === "desc" ? -1 : 1),
        )
      : data;

  const groupedData = new Map<string | symbol, TData[]>();

  for (const item of sortedData) {
    const groupKeys = group && fnGroup ? fnGroup(group, item) : NO_GROUP_KEY;

    for (const groupKey of groupKeys instanceof Set
      ? groupKeys.size === 0
        ? [NO_GROUP_KEY]
        : groupKeys
      : [groupKeys]) {
      const itemGroup = groupedData.get(groupKey) ?? [];
      itemGroup.push(item);
      groupedData.set(groupKey, itemGroup);
    }
  }

  const sortedGroupedData =
    group && fnGroupSort
      ? Array.from(groupedData).toSorted(([groupKeyA], [groupKeyB]) => {
          if (groupKeyA === NO_GROUP_KEY && groupKeyB === NO_GROUP_KEY) {
            return 0;
          }
          if (groupKeyA === NO_GROUP_KEY) {
            return 1;
          }
          if (groupKeyB === NO_GROUP_KEY) {
            return -1;
          }

          return fnGroupSort(group, groupKeyA as string, groupKeyB as string);
        })
      : Array.from(groupedData);

  const router = useRouter();
  const pathname = usePathname();

  const setGroup = (group: TGroup | (string & {})) => {
    const newSearchParams = updateSearchParams(searchParams, {
      key: searchParamNameGroup,
      value: group !== defaultGroup ? group : undefined,
    });
    const newHref = getHref(pathname, newSearchParams);
    router.push(newHref);
  };

  const setSort = (sort: `${TSort}:${"asc" | "desc"}` | (string & {})) => {
    const newSearchParams = updateSearchParams(searchParams, {
      key: searchParamNameSort,
      value: sort !== defaultSort ? sort : undefined,
    });
    const newHref = getHref(pathname, newSearchParams);
    router.push(newHref);
  };

  const setView = (view: TView | (string & {})) => {
    const newSearchParams = updateSearchParams(searchParams, {
      key: searchParamNameView,
      value: view !== defaultView ? view : undefined,
    });
    const newHref = getHref(pathname, newSearchParams);
    router.push(newHref);
  };

  const resetPreferences = () => {
    const newSearchParams = updateSearchParams(
      searchParams,
      {
        key: searchParamNameGroup,
      },
      {
        key: searchParamNameSort,
      },
      {
        key: searchParamNameView,
      },
    );
    const newHref = getHref(pathname, newSearchParams);
    router.push(newHref);
  };

  const {
    actionUtils,
    hasErrored: savePreferencesHasErrored,
    hasSucceeded: savePreferencesHasSucceeded,
  } = useDecayActionState();
  const {
    execute: savePreferencesExecute,
    isPending: savePreferencesIsPending,
  } = useAction(savePreferencesAction, actionUtils);

  const savePreferences = () => {
    savePreferencesExecute({
      id,
      preferences,
    });
  };

  const isDefaultPreferences = preferencesEqual(
    preferences,
    defaultPreferences,
  );
  const isUserPreferences = userPreferences
    ? preferencesEqual(preferences, userPreferences)
    : isDefaultPreferences;

  return {
    ...preferences,
    isDefaultPreferences,
    isUserPreferences,
    itemGroups: sortedGroupedData,
    resetPreferences,
    savePreferences,
    savePreferencesHasErrored,
    savePreferencesHasSucceeded,
    savePreferencesIsPending,
    setGroup,
    setSort,
    setView,
  };
}
