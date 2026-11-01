"use client";

import { NO_GROUP_KEY, useGroupSortView } from "@/lib/groupSortView/hook";
import type {
  Role,
  Workspace,
} from "@schornio/aibox-package-database/workspace/_types";
import { createContext, useContext } from "react";
import type { GroupSortFunctions } from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import type { ReactNode } from "react";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { useFilter } from "@/lib/useFilter";

export type WorkspaceWithUserRole = {
  userRole: Exclude<Role, "admin"> | "none";
} & Workspace;

type Groups = "first-letter" | "permission";

type Sorts = "name";

type Views = "table";

const roleOrder = ["admin", "workspace-admin", "editor", "user"];

const defaultPreferences: Preferences = {
  group: "permission",
  sort: "name:asc",
  view: "table",
};

const functions: GroupSortFunctions<WorkspaceWithUserRole, Groups, Sorts> = {
  group(group, workspace) {
    switch (group) {
      default:
      case "first-letter":
        return workspace.name?.trim().toUpperCase().charAt(0) ?? "";
      case "permission":
        return workspace.userRole ?? NO_GROUP_KEY;
    }
  },
  groupSort(type, groupKeyA, groupKeyB) {
    switch (type) {
      default:
        return groupKeyA.localeCompare(groupKeyB);
      case "permission":
        return roleOrder.indexOf(groupKeyB) - roleOrder.indexOf(groupKeyA);
    }
  },
  sort(type, userA, userB) {
    switch (type) {
      default:
      case "name":
        return (userA.name ?? "").localeCompare(userB.name ?? "");
    }
  },
};

const userEditPermissionListContext = createContext<
  | (ReturnType<typeof useFilter> &
      ReturnType<
        typeof useGroupSortView<WorkspaceWithUserRole, Groups, Sorts, Views>
      >)
  | undefined
>(undefined);

export function UserEditPermissionListProvider({
  workspaces: workspacesData,
  children,
  id,
  userPreferences,
}: {
  workspaces: WorkspaceWithUserRole[];
  children?: ReactNode;
  id: string;
  userPreferences: Preferences;
}) {
  const valueFilter = useFilter(workspacesData, {
    keys: ["name", "description"],
  });

  const valueGroupSortView = useGroupSortView<
    WorkspaceWithUserRole,
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
    <userEditPermissionListContext.Provider
      value={{ ...valueFilter, ...valueGroupSortView }}
    >
      {children}
    </userEditPermissionListContext.Provider>
  );
}

export function useUserEditPermissionList() {
  const context = useContext(userEditPermissionListContext);

  if (!context) {
    const error = new Error(
      "useUserEditPermissionList() called outside provider",
    );
    logError("UserEditPermissionListProvider", error);
    throw error;
  }

  return context;
}
