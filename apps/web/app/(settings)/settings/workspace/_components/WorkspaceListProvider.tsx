"use client";

import { createContext, useContext } from "react";
import type { GroupSortFunctions } from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import type { ReactNode } from "react";
import type { Workspace } from "@schornio/aibox-package-database/workspace/_types";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { useFilter } from "@/lib/useFilter";
import { useGroupSortView } from "@/lib/groupSortView/hook";

type Groups = "first-letter";

type Sorts = "name";

type Views = "table";

const defaultPreferences: Preferences = {
  group: "no-group",
  sort: "name:asc",
  view: "table",
};

const functions: GroupSortFunctions<Workspace, Groups, Sorts> = {
  group(group, workspace) {
    switch (group) {
      default:
      case "first-letter":
        return workspace.name?.trim().toUpperCase().charAt(0) ?? "";
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
      ReturnType<typeof useGroupSortView<Workspace, Groups, Sorts, Views>>)
  | undefined
>(undefined);

export function WorkspaceListProvider({
  workspaces: workspacesData,
  children,
  id,
  userPreferences,
}: {
  workspaces: Workspace[];
  children?: ReactNode;
  id: string;
  userPreferences: Preferences;
}) {
  const valueFilter = useFilter(workspacesData, {
    keys: ["name", "email"],
  });

  const valueGroupSortView = useGroupSortView<Workspace, Groups, Sorts, Views>(
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
