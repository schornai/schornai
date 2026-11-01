"use client";

import { createContext, useContext } from "react";
import type { GroupSortFunctions } from "@/lib/groupSortView/hook";
import { NO_GROUP_KEY } from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import type { ReactNode } from "react";
import type { WorkspaceClaim } from "../../../_models/getWorkspaceClaims";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { useFilter } from "@/lib/useFilter";
import { useGroupSortView } from "@/lib/groupSortView/hook";

type WorkspaceWithFavorite = WorkspaceClaim & { favorite: boolean };

type Groups = "first-letter" | "favorite";

type Sorts = "name";

type Views = "cards" | "table";

const defaultPreferences: Preferences = {
  group: "favorite",
  sort: "name:asc",
  view: "cards",
};

const functions: GroupSortFunctions<WorkspaceWithFavorite, Groups, Sorts> = {
  group(group, workspace) {
    switch (group) {
      case "favorite":
        return workspace.favorite ? "favorite" : NO_GROUP_KEY;
      case "first-letter":
        return workspace.name?.trim().toUpperCase().charAt(0) ?? "";
      default:
        return NO_GROUP_KEY;
    }
  },
  groupSort(_type, groupKeyA, groupKeyB) {
    return groupKeyA.localeCompare(groupKeyB);
  },
  sort(type, workspaceA, workspaceB) {
    switch (type) {
      default:
      case "name":
        return (workspaceA.name ?? "").localeCompare(workspaceB.name ?? "");
    }
  },
};

const workspaceListContext = createContext<
  | (ReturnType<typeof useFilter> &
      ReturnType<
        typeof useGroupSortView<WorkspaceWithFavorite, Groups, Sorts, Views>
      >)
  | undefined
>(undefined);

export function WorkspaceListProvider({
  workspaces: workspacesData,
  children,
  id,
  userPreferences,
}: {
  workspaces: WorkspaceWithFavorite[];
  children?: ReactNode;
  id: string;
  userPreferences: Preferences;
}) {
  const valueFilter = useFilter(workspacesData, {
    keys: ["name", "description"],
  });

  const valueGroupSortView = useGroupSortView<
    WorkspaceWithFavorite,
    Groups,
    Sorts,
    Views
  >(
    id,
    valueFilter.filteredData,
    functions,
    userPreferences,
    defaultPreferences,
  );

  return (
    <workspaceListContext.Provider
      value={{ ...valueFilter, ...valueGroupSortView }}
    >
      {children}
    </workspaceListContext.Provider>
  );
}

export function useWorkspaceList() {
  const context = useContext(workspaceListContext);

  if (!context) {
    const error = new Error("useWorkspaceList() called outside provider");
    logError("WorkspaceListProvider", error);
    throw error;
  }

  return context;
}
